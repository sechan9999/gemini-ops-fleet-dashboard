# Gemini Ops Fleet

## Automation with a visible boundary

Healthcare operations need more than capable agents. They need agents that operate inside explicit permissions, evidence boundaries, approval gates, and audit trails.

**Gemini Ops Fleet** is a governed operations console for a healthcare agent fleet. It turns asynchronous workflow events into inspectable, role-scoped work while keeping consequential decisions with accountable people. The system is designed for the **Fortified Enterprise Fleet** track of the Google “All Things Agentic” Hackathon.

> Automation prepares the work. The system enforces the boundary. An accountable human owns the decision.

## What the project demonstrates

Gemini Ops Fleet is not a chatbot waiting for a prompt. It is an event-driven control surface for agents that handle healthcare operational workflows such as denial analysis, care-gap evaluation, policy retrieval, triage, and reconciliation.

A synthetic healthcare event enters through the FastAPI fleet publisher and is routed to an agent with a registered capability, domain, autonomy grade, and restriction set. The agent can prepare an evidence-backed draft, but external actions remain behind a server-enforced human approval gate.

The dashboard makes that governance visible through a Clinical Command Ledger. Operators can inspect the event stream, review the full server-authorized clinical payload, request a Gemini-generated explanation, approve or reject a draft, and inspect the resulting audit history.

## Why the boundary matters

Prompt instructions are not an adequate security boundary for consequential healthcare workflows. Gemini Ops Fleet enforces key controls in the server and persistence layers:

| Control | How Gemini Ops Fleet enforces it |
| --- | --- |
| Server-derived identity | Reviewer identity is resolved from the authenticated session rather than accepted from browser input. |
| Least-privilege access | Medical Directors, Data Scientists, and Payer Operations users receive role-scoped views and actions. |
| Retrieval boundaries | SQL scope is applied before ranking or synthesis, excluding unauthorized cross-domain records before the model sees them. |
| Human approval | Drafts remain pending until an authorized operator approves them. |
| Safe refusal | An unapproved send attempt is rejected server-side with HTTP 409 Conflict. |
| Durable accountability | Approvals, rejection reasons, blocked calls, role changes, and notifications are persisted in audit history. |
| Reversible administration | Bulk role changes require a before-and-after dry run before commit. |
| Observable realtime operations | SSE delivery, connection counts, latency, dropped clients, and bridge outcomes are exposed through admin metrics and Prometheus. |

## Product walkthrough

The **Agent Registry** publishes the fleet’s operating contract. Payer Intelligence handles policy retrieval and denial analysis. Clinical & Quality handles guideline retrieval and care-gap evaluation. Triage and Reconcile support operational workflows. Healthcare agents are explicitly marked **Drafts only** when they cannot dispatch external actions.

The **Event Stream** records event kind, actor, routed agent, and state. The FastAPI production publisher can send authenticated role-change activity events through the dashboard bridge. Operators receive relevant changes through an authenticated Server-Sent Events stream, a persistent notification inbox, and configurable notification preferences.

The **Approval Queue** presents the evidence behind each proposed action. Operators can inspect the complete clinical payload and generate a concise Gemini clinical summary. Approval, rejection, and send transitions are protected by server-side role and state checks.

The **Audit & Trace** view treats successful and refused actions as equally important. It exposes blocked retrieval, prompt-injection screening, denied actions, approvals, rejection reasons, and other durable records needed for review.

The **Operator Admin** view manages profiles, roles, departments, bulk changes, and role-change history. Every bulk change begins with a dry-run preview showing before-and-after values and unchanged users.

The **Stream Health** panel visualizes active SSE connections and notification delivery latency over selectable time ranges. Administrators can monitor delivery counts, dropped clients, bridge failures, duplicate events, and threshold states such as **Watch** and **Critical**. The same operational metrics are available in Prometheus text exposition format at the protected `/metrics` endpoint.

## Architecture

The system connects a FastAPI workflow publisher, a governed agent fleet, server-enforced controls, durable MySQL/TiDB persistence through Drizzle ORM, and a React operations surface. The architecture diagram included with this submission shows how business events move through the fleet and how approval, audit, realtime notifications, and metrics remain connected.

![Gemini Ops Fleet architecture](https://files.manuscdn.com/user_upload_by_module/session_file/310519663647032050/PQogJesHgFdgXjxb.png)

## Technology

Gemini Ops Fleet uses React 19 and TypeScript for the operations surface, Tailwind CSS and Recharts for the visual control plane, Express and tRPC for typed server contracts, Drizzle ORM with MySQL/TiDB for durable persistence, Server-Sent Events for realtime delivery, Prometheus text exposition for scraping, and FastAPI for the production healthcare workflow publisher. Gemini is used for evidence-grounded clinical summaries and explanation support.

## Data and safety

All screens in the demo use synthetic healthcare data. The project is a governance prototype and does not make clinical diagnoses or autonomous treatment decisions. The approval workflow is intentionally designed so that an agent can prepare work without gaining unilateral authority to send an external action.

## How to evaluate the demo

Start with the overview to see the Clinical Command Ledger and visible governance chips. Open Agent Registry to inspect capability and restriction metadata. Follow the Event Stream to see asynchronous routing and blocked retrieval. Review the Approval Queue to inspect evidence and Gemini summaries. Use Audit & Trace to see refusal and approval records. The Operator Admin view demonstrates dry-run bulk role changes, notification delivery, and stream health trends.

## Hackathon impact

Gemini Ops Fleet addresses the enterprise problem behind agent adoption: organizations need to know not only whether an agent can complete a task, but whether the organization can prove who authorized it, what evidence it used, which boundaries were applied, what was refused, and how the fleet behaved in realtime.

By combining Gemini-assisted reasoning with server-enforced governance, human approval, durable auditability, and operational observability, Gemini Ops Fleet turns an agent fleet from an opaque automation layer into a reviewable enterprise system.
