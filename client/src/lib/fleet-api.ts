// Clinical Command Ledger design: this adapter keeps governance evidence visible and supports a safe demo mode when the FastAPI service is unavailable.

export type RuntimeMode = "cloud" | "offline" | "unknown";
export type ApprovalState = "pending" | "approved" | "sent" | "rejected";

export type FleetAgent = {
  id: string;
  name: string;
  domain: string;
  version: string;
  autonomy: "autonomous" | "drafts_only" | "read_only";
  capabilities: string[];
  restrictions: string[];
  health: "healthy" | "standby";
};

export type FleetEvent = {
  id: string;
  kind: string;
  actor: string;
  routedTo: string;
  status: "completed" | "pending" | "blocked";
  timestamp: string;
  detail: string;
};

export type AuditEntry = {
  id: string;
  actor: string;
  role: string;
  tool: string;
  outcome: "allowed" | "denied" | "blocked" | "approved" | "sent";
  detail: string;
  timestamp: string;
};

export type Approval = {
  id: string;
  actionType: string;
  agent: string;
  domain: string;
  subject: string;
  summary: string;
  state: ApprovalState;
  createdAt: string;
  evidence: string[];
  payload: Record<string, string>;
  approvedBy?: string;
};

export type FleetSnapshot = {
  runtime: {
    mode: RuntimeMode;
    model: string;
    database: string;
    guardrail: string;
    pubsub: string;
    trace: string;
  };
  agents: FleetAgent[];
  events: FleetEvent[];
  approvals: Approval[];
  audit: AuditEntry[];
};

const now = new Date();
const iso = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60000).toISOString();

export const demoSnapshot: FleetSnapshot = {
  runtime: {
    mode: "cloud",
    model: "gemini-3.5-flash",
    database: "Cloud SQL / PostgreSQL",
    guardrail: "Model Armor",
    pubsub: "OIDC push connected",
    trace: "Cloud Trace · OTel",
  },
  agents: [
    { id: "payer-intelligence", name: "Payer Intelligence", domain: "Payer operations", version: "0.4.2", autonomy: "drafts_only", health: "healthy", capabilities: ["Policy RAG", "Denial analysis", "Coverage verification"], restrictions: ["No direct dispatch", "Payer scope only", "Human approval required"] },
    { id: "clinical-quality", name: "Clinical & Quality", domain: "Clinical operations", version: "0.3.8", autonomy: "drafts_only", health: "healthy", capabilities: ["Guideline RAG", "Care-gap evaluation", "Quality initiatives"], restrictions: ["No patient outreach", "Clinical scope only", "Human approval required"] },
    { id: "triage", name: "Triage Agent", domain: "Operations", version: "1.1.0", autonomy: "autonomous", health: "healthy", capabilities: ["Ticket classification", "Owner assignment"], restrictions: ["No external messaging"] },
    { id: "reconcile", name: "Reconcile Agent", domain: "Accounting", version: "1.0.6", autonomy: "read_only", health: "standby", capabilities: ["Ledger comparison", "Variance report"], restrictions: ["Read-only records", "Accounting scope only"] },
  ],
  events: [
    { id: "evt-2048", kind: "denial.received", actor: "pubsub", routedTo: "Payer Intelligence", status: "completed", timestamp: iso(3), detail: "Synthetic denial CLM-9921 routed for policy analysis." },
    { id: "evt-2047", kind: "care_gap.detected", actor: "pubsub", routedTo: "Clinical & Quality", status: "completed", timestamp: iso(18), detail: "HEDIS-HbA1c cohort evaluation completed." },
    { id: "evt-2046", kind: "document.search", actor: "claims-specialist", routedTo: "Payer Intelligence", status: "blocked", timestamp: iso(31), detail: "Cross-domain contract-rate retrieval returned an empty permitted set." },
    { id: "evt-2045", kind: "prior_auth.requested", actor: "payer-intelligence", routedTo: "Payer Intelligence", status: "pending", timestamp: iso(48), detail: "Draft packet awaiting human decision." },
  ],
  approvals: [
    { id: "apr-047", actionType: "PRIOR_AUTH_DRAFT", agent: "Payer Intelligence", domain: "Payer operations", subject: "Synthetic patient hash_pt_3312", summary: "Prior authorization packet for CPT 75561 / ICD-10 I42.0", state: "pending", createdAt: iso(4), evidence: ["PAY-POL-101", "PAY-DEN-303"], payload: { cpt: "75561", icd10: "I42.0", rationale: "Synthetic cardiomyopathy case meets policy criteria.", destination: "Payer review queue" } },
    { id: "apr-046", actionType: "QUALITY_INITIATIVE_DRAFT", agent: "Clinical & Quality", domain: "Clinical operations", subject: "Synthetic cohort: Type 2 diabetes", summary: "HEDIS care-gap outreach initiative", state: "approved", createdAt: iso(72), approvedBy: "Dr. Maya Chen", evidence: ["CLN-GUIDE-401", "CLN-GROWTH-502"], payload: { measure: "HEDIS-HbA1c", cohort: "Synthetic Type 2 diabetes", destination: "Quality operations inbox" } },
  ],
  audit: [
    { id: "aud-8821", actor: "pubsub", role: "system", tool: "dispatch_event", outcome: "allowed", detail: "denial.received → payer-intelligence", timestamp: iso(3) },
    { id: "aud-8820", actor: "claims-specialist", role: "payer_ops", tool: "permitted_documents", outcome: "denied", detail: "SQL scope excluded confidential contract-rate document.", timestamp: iso(31) },
    { id: "aud-8819", actor: "payer-intelligence", role: "payer_ops", tool: "queue_prior_auth_request", outcome: "allowed", detail: "Draft queued; send capability absent from agent tools.", timestamp: iso(48) },
    { id: "aud-8818", actor: "unknown", role: "unknown", tool: "guardrail_plugin", outcome: "blocked", detail: "Prompt injection screened before model execution.", timestamp: iso(56) },
    { id: "aud-8817", actor: "Dr. Maya Chen", role: "medical_director", tool: "approve", outcome: "approved", detail: "Quality initiative approved for synthetic operations inbox.", timestamp: iso(72) },
  ],
};

async function request<T>(baseUrl: string, token: string, path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Fleet-Token": token, ...(options?.headers || {}) },
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export async function loadFleetSnapshot(baseUrl: string, token: string): Promise<FleetSnapshot> {
  if (!baseUrl) return demoSnapshot;
  try {
    const [registry, approvals, events, audit] = await Promise.all([
      request<{ agents: FleetAgent[] }>(baseUrl, token, "/fleet/registry"),
      request<{ approvals: Approval[] }>(baseUrl, token, "/fleet/approvals"),
      request<{ events: FleetEvent[] }>(baseUrl, token, "/fleet/events?limit=50"),
      request<{ entries: AuditEntry[] }>(baseUrl, token, "/fleet/audit?limit=50"),
    ]);
    return { runtime: demoSnapshot.runtime, agents: registry.agents, approvals: approvals.approvals, events: events.events, audit: audit.entries };
  } catch {
    return demoSnapshot;
  }
}

export async function approveDraft(baseUrl: string, token: string, approvalId: string): Promise<void> {
  if (!baseUrl) return;
  await request(baseUrl, token, `/fleet/approvals/${approvalId}/approve`, { method: "POST" });
}

export async function sendDraft(baseUrl: string, token: string, approvalId: string): Promise<void> {
  if (!baseUrl) return;
  await request(baseUrl, token, `/fleet/approvals/${approvalId}/send`, { method: "POST" });
}

export async function drainEvents(baseUrl: string, token: string): Promise<void> {
  if (!baseUrl) return;
  await request(baseUrl, token, "/fleet/events/drain", { method: "POST" });
}
