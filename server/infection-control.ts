export type InfectionControlSignal = {
  ward: string;
  signal: string;
  level: "watch" | "urgent" | "stable";
  freshness: string;
  owner: string;
  evidence: string;
  action: string;
  resource: string;
};

export type InfectionControlTask = {
  label: string;
  count: number;
  tone: "urgent" | "watch" | "stable";
  kind: "precaution" | "cleaning" | "training";
};

export function validateInfectionControlTransition(action: "verify" | "escalate" | "dismiss", reason?: string) {
  if ((action === "escalate" || action === "dismiss") && !reason?.trim()) {
    throw new Error("A reason is required for escalation or dismissal");
  }
  return true;
}

export function assertInfectionControlReviewer(role: string | undefined) {
  if (role !== "medical_director" && role !== "payer_operations") {
    throw new Error("This role cannot record an infection-control human-gate decision");
  }
  return true;
}

export async function recordInfectionControlDecision(input: { role?: string; actor: string; signal: string; action: "verify" | "escalate" | "dismiss"; reason?: string; writeAudit: (entry: { actor: string; role: string; tool: string; outcome: string; detail: string }) => Promise<unknown> }) {
  assertInfectionControlReviewer(input.role);
  validateInfectionControlTransition(input.action, input.reason);
  const outcome = input.action === "verify" ? "approved" : input.action === "dismiss" ? "rejected" : "blocked";
  await input.writeAudit({ actor: input.actor, role: input.role || "medical_director", tool: `ipc_${input.action}`, outcome, detail: input.action === "verify" ? `IPC signal verified by human reviewer: ${input.signal}` : `${input.action === "escalate" ? "IPC signal escalated" : "IPC signal dismissed"}: ${input.reason?.trim()}` });
  return { signal: input.signal, action: input.action, recordedBy: input.actor };
}

export function getInfectionControlOverview() {
  return {
    mode: "synthetic_facility" as const,
    signals: [
      { ward: "Ward 2 · Medical", signal: "Hand-hygiene observation gap", level: "urgent", freshness: "18 min ago", owner: "Nurse manager", evidence: "7 of 24 observations logged this shift", action: "Verify observation coverage before next handoff", resource: "One trained observer" },
      { ward: "Ward 1 · Surgical", signal: "PPE cart readiness", level: "watch", freshness: "42 min ago", owner: "IPC lead", evidence: "N95 stock count is stale; last check was yesterday", action: "Reconcile cart count and document exception", resource: "Inventory check · 10 min" },
      { ward: "Ward 3 · Rehab", signal: "Environmental cleaning feedback", level: "stable", freshness: "1 hr ago", owner: "Environmental services", evidence: "12 of 12 high-touch checks recorded", action: "Continue current audit cadence", resource: "No additional staffing" },
    ] satisfies InfectionControlSignal[],
    tasks: [
      { label: "Transmission-based precaution review", count: 2, tone: "urgent", kind: "precaution" },
      { label: "High-touch surface verification", count: 4, tone: "watch", kind: "cleaning" },
      { label: "Frontline refresher training", count: 1, tone: "stable", kind: "training" },
    ] satisfies InfectionControlTask[],
    safety: {
      syntheticOnly: true,
      autonomousDeclarations: false,
      humanApprovalRequired: true,
    },
  };
}
