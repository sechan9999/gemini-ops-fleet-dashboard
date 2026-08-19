import { describe, expect, it } from "vitest";
import { getInfectionControlOverview, recordInfectionControlDecision, recordInfectionControlTaskUpdate, validateInfectionControlTransition } from "./infection-control";

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
    expect(overview.tasks.every(task => task.id && task.reason && ["high", "medium", "low"].includes(task.priority))).toBe(true);
    expect(overview.trends.source).toBe("synthetic_facility");
    expect(overview.trends.daily).toHaveLength(7);
    expect(overview.trends.weekly).toHaveLength(4);
    expect(overview.trends.daily.every(point => /^2026-\d{2}-\d{2}$/.test(point.dateKey) && point.openTasks >= 0 && point.completedTasks >= 0)).toBe(true);
  });

  it("gates bulk task updates and records one durable audit entry", async () => {
    const auditRows: Array<{ actor: string; role: string; tool: string; outcome: string; detail: string }> = [];
    let durableInput: { lastComment?: string } = {};
    const result = await recordInfectionControlTaskUpdate({ role: "medical_director", actor: "Dr. HK Chun", taskIds: ["ipc-precaution-review", "ipc-surface-verification"], priority: "medium", status: "in_progress", comment: "Reviewed with ward lead", writeAudit: async row => { auditRows.push(row); }, updateTasks: async input => { durableInput = input; return input; } });
    expect(result.taskIds).toHaveLength(2);
    expect(auditRows[0]).toMatchObject({ actor: "Dr. HK Chun", role: "medical_director", tool: "ipc_task_update", outcome: "updated" });
    expect(auditRows[0].detail).toContain("Reviewed with ward lead");
    expect(durableInput.lastComment).toBe("Reviewed with ward lead");
    await expect(recordInfectionControlTaskUpdate({ role: "data_scientist", actor: "Analyst", taskIds: ["ipc-precaution-review"], priority: "low", writeAudit: async () => undefined, updateTasks: async input => input })).rejects.toThrow("cannot record");
    await expect(recordInfectionControlTaskUpdate({ role: "medical_director", actor: "Dr. HK Chun", taskIds: [], priority: "high", writeAudit: async () => undefined, updateTasks: async input => input })).rejects.toThrow("between 1 and 50");
  });

  it("keeps autonomous declarations disabled and human approval required", () => {
    const overview = getInfectionControlOverview();
    expect(overview.safety.syntheticOnly).toBe(true);
    expect(overview.safety.autonomousDeclarations).toBe(false);
    expect(overview.safety.humanApprovalRequired).toBe(true);
  });
});
