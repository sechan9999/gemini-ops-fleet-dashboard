import { describe, expect, it } from "vitest";
import { getInfectionControlOverview, recordInfectionControlDecision, validateInfectionControlTransition } from "./infection-control";

describe("infection-control overview", () => {
  it("returns synthetic ward signals with accountable owners and evidence", () => {
    const overview = getInfectionControlOverview();
    expect(overview.mode).toBe("synthetic_facility");
    expect(overview.signals.length).toBeGreaterThan(0);
    expect(overview.signals.every(signal => signal.owner && signal.evidence && signal.action)).toBe(true);
  });

  it("requires reasons for escalation and dismissal while allowing verification", () => {
    expect(validateInfectionControlTransition("verify")).toBe(true);
    expect(validateInfectionControlTransition("escalate", "Needs IPC lead review")).toBe(true);
    expect(() => validateInfectionControlTransition("dismiss")).toThrow("reason is required");
    expect(() => validateInfectionControlTransition("escalate", "  ")).toThrow("reason is required");
  });

  it("enforces reviewer roles and writes a durable audit entry", async () => {
    const auditRows: Array<{ actor: string; role: string; tool: string; outcome: string; detail: string }> = [];
    const result = await recordInfectionControlDecision({ role: "medical_director", actor: "Dr. HK Chun", signal: "Hand-hygiene observation gap", action: "verify", writeAudit: async row => { auditRows.push(row); } });
    expect(result.action).toBe("verify");
    expect(auditRows[0]).toMatchObject({ actor: "Dr. HK Chun", role: "medical_director", tool: "ipc_verify", outcome: "approved" });
    expect(auditRows[0].detail).toContain("Hand-hygiene observation gap");
    await expect(recordInfectionControlDecision({ role: "data_scientist", actor: "Analyst", signal: "PPE cart readiness", action: "verify", writeAudit: async () => undefined })).rejects.toThrow("cannot record");
    await expect(recordInfectionControlDecision({ role: "medical_director", actor: "Dr. HK Chun", signal: "PPE cart readiness", action: "escalate", writeAudit: async () => undefined })).rejects.toThrow("reason is required");
  });

  it("exposes reason-tagged tasks and both daily and weekly operational trends", () => {
    const overview = getInfectionControlOverview();
    expect(overview.tasks.every(task => task.reason)).toBe(true);
    expect(overview.trends.source).toBe("synthetic_facility");
    expect(overview.trends.daily).toHaveLength(7);
    expect(overview.trends.weekly).toHaveLength(4);
    expect(overview.trends.daily.every(point => point.openTasks >= 0 && point.completedTasks >= 0)).toBe(true);
  });

  it("keeps autonomous declarations disabled and human approval required", () => {
    const overview = getInfectionControlOverview();
    expect(overview.safety.syntheticOnly).toBe(true);
    expect(overview.safety.autonomousDeclarations).toBe(false);
    expect(overview.safety.humanApprovalRequired).toBe(true);
  });
});
