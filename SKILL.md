---
name: agentic-ops-governance-dashboard
description: Build or extend governed enterprise agent-operation dashboards with server-derived identity, role-scoped views, human approval gates, Gemini summaries, durable audit trails, healthcare IPC workflows, category analytics, accessible queue controls, and CSV exports. Use for governance consoles, healthcare or payer approval workflows, agent fleet observability UIs, or similar React/FastAPI systems.
---

# Agentic Operations Governance Dashboard

Build the product as an **accountability surface**, not a chat UI. Keep agents autonomous for drafting, routing, retrieval, and bounded explanation, while keeping approval, rejection, escalation, dismissal, policy changes, and outbound dispatch behind authenticated human-gate procedures.

## Core implementation workflow

1. Inspect the existing identity resolver, role vocabulary, approval states, audit writer, API routes, database schema, frontend adapters, and dashboard shell. Reuse existing state transitions and components before introducing new abstractions.
2. Define the server contract before editing the UI. Derive operator identity and role from the authenticated session; never accept role, employee ID, department, or approval authority from client form data.
3. Persist approval states such as pending, approved, rejected, and sent. Require a non-empty rejection reason, persist the actor and reason, and create an audit entry containing the decision context.
4. Keep Gemini calls server-side. Send only bounded, synthetic, or explicitly permitted data. Instruct the model to explain operational signal, implication, and uncertainty without inventing patient facts, treatment recommendations, diagnoses, or autonomous decisions. Provide deterministic fallback behavior.
5. Normalize live and demo records through typed adapters. Label synthetic/demo data explicitly and never silently present fallback data as live.
6. Build role-scoped views and server-enforced procedures. Hide or disable unauthorized actions in the UI, but treat the server authorization boundary as authoritative.
7. Build detailed request drawers or modals with evidence, metadata, model explanation, current state, and audit/rejection history. Preserve keyboard access, visible focus, and clear close behavior.
8. Add protected pagination, search, filters, sorting, CSV export, and stable headers. Export the currently filtered/sorted rows and escape quotes, commas, and newlines.
9. Add admin-only operator management, role/department distribution analytics, explicit bulk-edit confirmation, before/after preview, and one audit record per changed operator.
10. Validate tests, type checking, production build, authorization boundaries, migration safety, CSV contents, responsive layout, and representative browser flows before checkpointing.

## IPC command-center pattern

Use this extension for infection-prevention and control workflows in constrained hospital environments.

- Keep ward signals and task data synthetic or explicitly permitted. Present risk signals, evidence freshness, resource gaps, and suggested next checks as operational prompts, never clinical declarations.
- Protect trend Q&A and AI comment categorization behind server procedures. Send only bounded trend points, normalized task snapshots, or comment records from the selected queue context. Constrain answers to supplied data and state uncertainty.
- Persist the latest explanatory comment for queue convenience and store every comment in an append-only timeline with task ID, actor, server-derived role, and UTC timestamp. Render the full chronological timeline inline; treat hover previews as concise, non-authoritative summaries.
- Let inline and bulk status/priority changes carry bounded explanatory comments through the same protected mutation. Persist comments and attributed audit details together, invalidate/refetch durable task data after success, and show progress, success, and failure feedback.
- Return per-task AI category assignments and bounded daily/weekly date-bucket trend points from the protected categorization procedure. Use these assignments for category-over-time charts and queue filters; never reclassify comments only in the browser. Categories should remain operational, for example verification, resource, training, coverage, and other.
- Keep category and comment filters in saved queue presets so repeat investigations are reproducible. Preserve active filters in filtered CSV exports.
- Make comment previews focusable and keyboard reachable, use safe wrapping and a constrained scroll container, and highlight the newest comment distinctly. On narrow screens, move the preview to a fixed viewport-safe surface while retaining the inline timeline.
- Split dense queue controls into labeled **Filters** and **Export** groups. Keep search, reason/status/comment/category filters, priority sorting, and saved presets in the filter group. Keep filtered queue, selected-task, audit CSV, and preset actions in the export/action group.
- Add accessible hover and keyboard-focus tooltips to actions whose effect may be unclear, especially preset, filtered export, selected export, and audit export buttons. Tooltips must supplement visible labels and must not be the only accessible name.
- Use a shared export runner that sets an exporting state before generating CSV, yields briefly so the spinner can render, disables competing export actions, shows a loading label, and clears the state after completion. Keep download generation client-side only for already-authorized rows.

## Safety and governance rules

- Use synthetic or explicitly permitted clinical data for demos; never fabricate clinical facts, reviews, ratings, or testimonials.
- Treat Gemini output as an explanation aid, never as approval authority, diagnosis, treatment advice, or an autonomous declaration.
- Enforce authorization on the server and repeat human-gate checks immediately before sensitive transitions or send actions.
- Store rejection, escalation, dismissal, policy, role, and comment reasons as durable audit data; do not rely on toast text or client-only state.
- Review every generated migration before applying it. Use non-destructive schema changes and preserve approval, audit, profile, telemetry, and IPC comment history.
- Keep pagination, exports, role assignment, and comment categorization boundaries server-aware even when the UI supplies matching filters.
- Record UTC timestamps at the API/database layer and localize them only for display.

## Expected deliverables

Deliver a working React dashboard, protected backend procedures, typed API contracts, durable schema updates, responsive UI, focused tests, a short verification report, and a demo-ready workflow showing event arrival, governed explanation, human decision, audit history, IPC queue filtering, chronological comments, category trends, accessible action feedback, and safe CSV export.
