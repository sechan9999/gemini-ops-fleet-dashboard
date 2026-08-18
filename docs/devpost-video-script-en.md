# Gemini Ops Fleet — Devpost 4-Minute Demo Script

## Narration

### 0:00–0:25 — Problem and thesis
Healthcare operations can be automated quickly, but making automation stop safely is harder. Gemini Ops Fleet is a governed operations console for healthcare agents. It lets agents prepare useful work while keeping identity, data, and external actions inside explicit boundaries. The core question is not only what an agent can do, but what it is structurally unable to do.

### 0:25–0:55 — Clinical Command Ledger
This is the Clinical Command Ledger. Async routing, SQL scope, and a human gate are visible in the same decision surface. Gemini Ops Fleet is not a chatbot waiting for prompts. It is an event-driven agent fleet that operates on synthetic healthcare data and leaves an inspectable record of each step.

### 0:55–1:25 — Agent Registry
The Agent Registry publishes the fleet’s operating contract. Payer Intelligence handles policy retrieval and denial analysis. Clinical and Quality handles guidelines and care gaps. Triage and Reconcile support operational workflows. Every agent has a version, domain, capabilities, autonomy grade, and restrictions. The healthcare agents are marked Drafts only: they can prepare a packet, but they cannot directly dispatch it.

### 1:25–1:55 — Event Stream
Now we move to the Event Stream. A synthetic denial arrives as a business event. The system records its actor, event kind, routed agent, and state, then sends it to the correct scope. In production, the FastAPI publisher sends authenticated role-change events through the fleet bridge, while Server-Sent Events notify subscribed operators in real time. The fleet moves because work happened, not because someone typed a prompt.

### 1:55–2:25 — Evidence and approval queue
The agent’s analysis arrives with evidence in the approval queue. Each request exposes the synthetic subject, action type, evidence identifiers, destination, and a Gemini clinical summary. The detail drawer shows the full server-authorized payload. Retrieval is filtered by SQL scope before ranking or synthesis, so an unauthorized cross-domain document is excluded before the model can ever see it.

### 2:25–2:55 — Human gate and HTTP 409
This is the human gate. Without approval, the draft remains safely held. If someone tries to send it early, the backend returns HTTP 409 Conflict and records why approval is missing. This is not a disabled button or a prompt instruction. The server re-checks the approval state on every send request, so an unapproved external action cannot leave the system.

### 2:55–3:20 — Approval and audit
An authorized Medical Director can now approve the packet. The reviewer identity comes from the authenticated server session, not from a browser-supplied name. Approval, rejection reasons, blocked calls, and successful actions are written to the audit trail. Once approved, the controlled action can be sent, with the same traceability as the refusal path.

### 3:20–3:45 — Admin governance and realtime inbox
The Operator Admin view provides least-privilege profile management. Bulk edits begin with a before-and-after dry run, and only changed users create durable audit rows and notifications. Role-change notifications arrive through the persistent inbox and SSE, with operator-configurable preferences. Governance is not a hidden policy; it is an operational workflow.

### 3:45–4:00 — Stream health and conclusion
Finally, Stream Health tracks active connections, delivery latency, and dropped clients. Prometheus metrics and administrator-only trend charts make the notification system observable. Time ranges expose connection and latency trends, while Watch and Critical states highlight threshold breaches. Gemini Ops Fleet makes the boundary visible: automation prepares the work, the system enforces the rules, and the accountable human owns the decision.
