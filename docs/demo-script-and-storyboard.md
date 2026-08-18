# Gemini Ops Fleet — 4-Minute Hackathon Demo Script and Storyboard

## Demo objective

Show that Gemini Ops Fleet is not a chatbot waiting for prompts. It is an asynchronous healthcare operations fleet that performs useful analysis, enforces cross-domain boundaries, and stops before an external action unless a human approves it.

Use synthetic healthcare data throughout the recording. Keep the FastAPI service, Pub/Sub console, Cloud Run proof, and dashboard visible enough that judges can connect the UI to the Google Cloud architecture.

## Recording setup

| Item | Recommended setup |
|---|---|
| Browser | Dashboard at the verified hosted URL, 1280×800 or 1440×900 |
| Backend | Cloud Run service connected to Vertex AI, Cloud SQL, Pub/Sub, and Model Armor if verified |
| Dashboard role | Medical director or payer operations reviewer; identity resolved by token/server |
| Data | Synthetic denial `CLM-9921`, CPT `75561`, ICD-10 `I42.0`, policy IDs `PAY-POL-101` and `PAY-DEN-303` |
| Recording style | One continuous take if possible; no montage of fake success states |
| Required proof | Cloud Run, Vertex AI, Pub/Sub delivery, dashboard approval state, HTTP 409 refusal, audit trail |

## Storyboard and spoken script

### 0:00–0:20 — Problem and thesis

**Screen:** Start on the dashboard Overview tab. Keep the sidebar, the hero statement, and the four evidence chips visible.

**Voiceover:**

“Healthcare operations teams spend hours moving between denial records, payer policies, clinical guidelines, and approval queues. The work is repetitive, but the consequences of an over-permissioned agent are not. Gemini Ops Fleet is built around one question: not only what can an agent do, but what is it structurally unable to do?”

**On-screen cue:** Point to `ASYNC ROUTING`, `SQL SCOPE`, and `HUMAN GATE`.

**Key proof:** Establish the product thesis and the synthetic-data boundary before showing any patient-like record.

### 0:20–0:45 — Introduce the fleet and its governance model

**Screen:** Click **Agent registry**. Show Payer Intelligence, Clinical & Quality, Triage, and Reconcile. Point to the autonomy pills and restrictions.

**Voiceover:**

“This is a fleet, not a single assistant. Payer Intelligence handles policy retrieval, denial analysis, and coverage verification. Clinical and Quality handles guidelines and care gaps. Triage and Reconcile cover operational workflows. The registry publishes each agent’s version, scope, capabilities, and restrictions. Notice that the healthcare agents are marked ‘Drafts only’: they can prepare work, but they do not have a send capability.”

**On-screen cue:** Hover or point at `Drafts only`, `No direct dispatch`, and `Human approval required`.

**Key proof:** Agent registry, lifecycle metadata, and autonomy grades.

### 0:45–1:25 — Demonstrate asynchronous execution

**Screen:** Click **Event stream**. If the backend has a verified seed endpoint, trigger a synthetic `denial.received` event. Otherwise use the prepared event and show the event lifecycle. Open the Google Cloud Pub/Sub console in a second browser tab if needed.

**Voiceover:**

“The fleet does not wait for a user prompt. A synthetic denial arrives as a business event. The application writes the Activity record and outbox entry, Pub/Sub delivers the event to the private Cloud Run service, and the worker routes it to Payer Intelligence. The dashboard is reading the same operational state that the backend records: event kind, actor, owning agent, and dispatch status.”

**On-screen cue:** Show `denial.received → Payer Intelligence`, actor `pubsub`, and `completed` state. Briefly show Pub/Sub delivery and the Cloud Run service.

**Key proof:** Background execution, Google Cloud infrastructure, and event-driven routing.

### 1:25–2:00 — Show useful healthcare analysis and SQL-first retrieval

**Screen:** Open the **Approval queue** or the agent workflow view associated with the denial. Show the prior-authorization draft and supporting evidence IDs. Then navigate to **Audit & trace** and locate the denied cross-domain retrieval entry.

**Voiceover:**

“Payer Intelligence retrieves the permitted policy documents, analyzes the denial, and prepares a prior-authorization packet with citations. The retrieval boundary is applied before ranking: a clinician or unauthorized role asking for confidential payer contract rates receives an empty permitted set. That is not a refusal invented by the model. The rows were excluded by the server-side SQL scope before synthesis.”

**On-screen cue:** Highlight `PAY-POL-101`, `PAY-DEN-303`, then the audit entry saying the contract-rate document was excluded.

**Key proof:** Operational utility, grounded evidence, and cross-domain isolation.

### 2:00–2:35 — Demonstrate the approval queue

**Screen:** Click the pending approval card `PRIOR_AUTH_DRAFT`. Open the detail drawer. Show action type, synthetic subject, evidence, destination, and draft payload.

**Voiceover:**

“Now the work is ready, but it is not yet authorized to leave the system. The approval drawer exposes the exact action, its destination, the synthetic subject, and the supporting documents. This is the human gate: the agent prepared the packet, while the person accountable for the operation decides what happens next.”

**On-screen cue:** Keep the `Pending review` pill and the amber left rail in view.

**Key proof:** Reviewability, accountability, and a clear separation between agent work and human decision.

### 2:35–3:00 — Prove the refusal path with HTTP 409

**Screen:** Click **Try send** while the approval is still pending. Keep the toast and the pending card visible. If possible, show the network response or API log with `409 Conflict`.

**Voiceover:**

“Here is the most important part of the demo. I will attempt to send the draft before approval. The system returns HTTP 409 Conflict: no human sign-off is on record. This is not a prompt instruction, and it is not a UI-only disabled button. The server-side send operation re-checks the approval state and refuses the action.”

**On-screen cue:** Pause for two seconds on `409 · Send refused` and the text `The draft remains safely held.`

**Key proof:** Deterministic human gate enforced by the backend.

### 3:00–3:25 — Approve and complete the controlled action

**Screen:** Open the drawer again and click **Approve draft**. Show the state transition to `Approved`, the reviewer identity `Dr. Maya Chen`, then click **Send approved action**.

**Voiceover:**

“Now I approve the packet as the authenticated reviewer. The state changes to Approved and the reviewer is recorded by the server; the browser did not submit an arbitrary reviewer name. Only after approval do I send the synthetic action. The workflow completes, but it remains auditable.”

**On-screen cue:** Show `Approved`, then `Sent`, then the success toast.

**Key proof:** Correct state transition and server-derived human identity.

### 3:25–3:45 — Close the loop in audit and trace

**Screen:** Click **Audit & trace**. Show the newly added approval/send records alongside the earlier denial and guardrail block. If available, open the Cloud Trace span or show a prepared Cloud Trace tab.

**Voiceover:**

“The audit surface records both successes and refusals: the Pub/Sub dispatch, the protected retrieval denial, the blocked prompt-injection attempt, the human approval, and the final send. OpenTelemetry attributes make the governance outcome searchable in Cloud Trace, so operators can answer not only whether the agent ran, but what it was allowed to do.”

**On-screen cue:** Search for `denied`, `blocked`, or `approve`; pause on the evidence labels.

**Key proof:** Observability, refusal telemetry, and accountability.

### 3:45–4:00 — Architecture and final message

**Screen:** Show the architecture diagram, then briefly show Cloud Run, Vertex AI, Pub/Sub, Cloud SQL, and the dashboard in a split window or rapid sequence. End back on the Overview hero.

**Voiceover:**

“Gemini Ops Fleet combines Gemini through Vertex AI, Google ADK, Cloud Run, Cloud SQL, Pub/Sub, Secret Manager, Model Armor, and OpenTelemetry. The result is a fleet that can do meaningful asynchronous healthcare operations work while preserving a visible boundary around identity, data, and external action. Automation does the preparation. The accountable human still owns the decision.”

**On-screen cue:** End on the sentence `Automation with a visible boundary.`

## Backup plan if the live cloud path fails

If Pub/Sub delivery or Vertex AI becomes unavailable during recording, do not pretend that the cloud path succeeded. Switch the dashboard to its explicit offline/demo mode, show the runtime badge, and narrate the difference: “The same governance behavior is running locally with SQLite and the heuristic guardrail; the cloud proof is shown separately in the recorded deployment evidence.” Use a pre-recorded browser tab showing the verified Cloud Run and Pub/Sub path only if the submission rules and recording format permit it.

## Presenter checklist

- [ ] Verify that the dashboard URL, Cloud Run URL, Pub/Sub topic, and Vertex AI project are real before recording.
- [ ] Seed only synthetic healthcare data.
- [ ] Preload one pending prior-authorization draft and one approved quality initiative.
- [ ] Confirm that the pending send returns `409 Conflict` in the deployed environment.
- [ ] Confirm that the approval endpoint records the server-derived reviewer identity.
- [ ] Confirm that the audit view shows both allowed and denied calls.
- [ ] Capture Cloud Run, Pub/Sub, Vertex AI, Cloud SQL, and Cloud Trace evidence.
- [ ] Keep the final edit close to four minutes and avoid unsupported claims about HIPAA compliance, clinical validation, or working Memory Bank recall.
