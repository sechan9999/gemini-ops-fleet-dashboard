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

export type InfectionControlTaskReason = "coverage_gap" | "ppe_readiness" | "environmental_cleaning" | "training_gap";

export type InfectionControlTask = {
  id: string;
  label: string;
  count: number;
  tone: "urgent" | "watch" | "stable";
  priority: "high" | "medium" | "low";
  kind: "precaution" | "cleaning" | "training";
  reason: InfectionControlTaskReason;
};

export type InfectionControlTrendPoint = {
  dateKey: string;
  label: string;
  openTasks: number;
  urgentTasks: number;
  watchTasks: number;
  stableTasks: number;
  completedTasks: number;
  escalations: number;
  dismissals: number;
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
      { id: "ipc-precaution-review", label: "Transmission-based precaution review", count: 2, tone: "urgent", priority: "high", kind: "precaution", reason: "coverage_gap" },
      { id: "ipc-surface-verification", label: "High-touch surface verification", count: 4, tone: "watch", priority: "medium", kind: "cleaning", reason: "environmental_cleaning" },
      { id: "ipc-refresher-training", label: "Frontline refresher training", count: 1, tone: "stable", priority: "low", kind: "training", reason: "training_gap" },
    ] satisfies InfectionControlTask[],
    safety: {
      syntheticOnly: true,
      autonomousDeclarations: false,
      humanApprovalRequired: true,
    },
    trends: getInfectionControlTrends(),
  };
}

export function getInfectionControlTrends(filters?: { from?: string; to?: string }) {
  const inRange = (dateKey: string) => (!filters?.from || dateKey >= filters.from) && (!filters?.to || dateKey <= filters.to);
  return {
    source: "synthetic_facility" as const,
    daily: [
      { dateKey: "2026-08-10", label: "Mon", openTasks: 9, urgentTasks: 3, watchTasks: 4, stableTasks: 2, completedTasks: 5, escalations: 1, dismissals: 0 },
      { dateKey: "2026-08-11", label: "Tue", openTasks: 8, urgentTasks: 2, watchTasks: 4, stableTasks: 2, completedTasks: 6, escalations: 1, dismissals: 1 },
      { dateKey: "2026-08-12", label: "Wed", openTasks: 10, urgentTasks: 4, watchTasks: 4, stableTasks: 2, completedTasks: 4, escalations: 2, dismissals: 0 },
      { dateKey: "2026-08-13", label: "Thu", openTasks: 7, urgentTasks: 2, watchTasks: 3, stableTasks: 2, completedTasks: 8, escalations: 1, dismissals: 1 },
      { dateKey: "2026-08-14", label: "Fri", openTasks: 6, urgentTasks: 1, watchTasks: 3, stableTasks: 2, completedTasks: 9, escalations: 0, dismissals: 2 },
      { dateKey: "2026-08-15", label: "Sat", openTasks: 7, urgentTasks: 2, watchTasks: 3, stableTasks: 2, completedTasks: 6, escalations: 1, dismissals: 0 },
      { dateKey: "2026-08-16", label: "Sun", openTasks: 7, urgentTasks: 2, watchTasks: 4, stableTasks: 1, completedTasks: 7, escalations: 1, dismissals: 1 },
    ].filter((point) => inRange(point.dateKey)) satisfies InfectionControlTrendPoint[],
    weekly: [
      { dateKey: "2026-07-20", label: "Week 1", openTasks: 42, urgentTasks: 12, watchTasks: 20, stableTasks: 10, completedTasks: 31, escalations: 4, dismissals: 3 },
      { dateKey: "2026-07-27", label: "Week 2", openTasks: 38, urgentTasks: 10, watchTasks: 19, stableTasks: 9, completedTasks: 36, escalations: 3, dismissals: 4 },
      { dateKey: "2026-08-03", label: "Week 3", openTasks: 34, urgentTasks: 8, watchTasks: 18, stableTasks: 8, completedTasks: 41, escalations: 3, dismissals: 5 },
      { dateKey: "2026-08-10", label: "Week 4", openTasks: 29, urgentTasks: 7, watchTasks: 15, stableTasks: 7, completedTasks: 47, escalations: 2, dismissals: 6 },
    ].filter((point) => inRange(point.dateKey)) satisfies InfectionControlTrendPoint[],
  };
}
