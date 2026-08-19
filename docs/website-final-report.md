# Gemini Ops Fleet — Website Final Report

## Executive Summary

Gemini Ops Fleet is a governed healthcare agent-operations dashboard for the Google All Things Agentic Hackathon, Fortified Enterprise Fleet track. The application combines a Clinical Command Ledger, role-scoped operations views, durable auditability, human approval gates, real-time SSE notifications, infection-control workflows, and Prometheus-compatible observability.

The latest upgrade extends the product from general workflow governance into a practical infection-prevention and control command center for hospitals with limited staffing. The system makes the next safe action visible while keeping declarations, escalations, outbound notifications, and policy changes behind authenticated human decisions.

## Delivered Capabilities

| Area | Delivered behavior |
|---|---|
| Clinical Command Ledger | Durable approval requests, Gemini summaries, server-derived operator identity, human approvals, rejection reasons, and audit history. |
| Role-based access | Medical Director, Data Scientist, and Payer Operations views are resolved from server-backed operator profiles and enforced by protected procedures. |
| Realtime governance | Authenticated SSE notification delivery for role and department changes, durable inbox state, preferences, stream health metrics, and latency trends. |
| IPC Command Center | Synthetic ward risk signals, evidence freshness, resource constraints, prioritized IPC task queue, low-resource mode, and evidence drawer. |
| IPC human gate | Verify, escalate, and dismiss decisions are role-gated. Escalation and dismissal require a non-empty reason, and every decision is written to the audit trail. |
| Hospital IPC policy | Admin-only facility policy form for hand-hygiene watch and critical thresholds, evidence/PPE freshness windows, notification preferences, and low-resource defaults. The server rejects invalid critical-at-or-above-watch configurations. |
| Exports | Approval queue, IPC work queue, and filtered audit records can be downloaded as CSV files with stable headers and safe escaping. |
| Operational observability | Protected admin stream-health view, historical connection and latency charts, threshold status indicators, and Prometheus `/metrics` endpoint. |

## Governance and Safety Boundaries

> Automation prepares evidence and recommended next checks; it does not autonomously declare an infection or send an external clinical action.

The infection-control interface is explicitly synthetic and operational. It presents observations such as hand-hygiene gaps, PPE readiness, environmental cleaning feedback, and staffing constraints as prompts for local review. The backend requires an authenticated operator with approval authority before recording a human-gate transition. Reasons are mandatory for escalation and dismissal so that the decision context remains inspectable after the UI session ends.

The IPC policy settings are administrative controls for prioritization and notification behavior. They do not alter the clinical boundary or authorize autonomous diagnosis. All policy writes are protected by the admin procedure and include the server-resolved administrator name in the persistence layer.

## Validation Performed

| Check | Result |
|---|---|
| Vitest suite | 19 tests passed across 7 test files. |
| TypeScript | `pnpm exec tsc --noEmit` passed. |
| Production build | Vite client build and bundled Express server build passed. |
| IPC/admin visual verification | Desktop full-page captures verified `/?tab=admin` and `/?tab=infection`; policy controls and queue export actions are visible and responsive. |
| Database persistence | `ipcPolicies` contains the default hospital policy row with Community General Hospital, 80% watch, 60% critical, 60-minute evidence freshness, 24-hour PPE freshness, and enabled urgent/watch alerts. |
| API contract | OpenAPI documentation now includes `admin.ipcPolicy`, `admin.updateIpcPolicy`, the IPC reason contract, and CSV export contracts. |

## Hackathon Positioning

Gemini Ops Fleet demonstrates a practical governed-agent pattern: fleet automation improves speed and situational awareness, while identity, role enforcement, human approval, evidence, audit, realtime delivery, and operational metrics make the system defensible in an enterprise environment. The IPC extension gives the hackathon narrative a concrete healthcare setting where smaller hospitals can benefit from carefully bounded AI without surrendering accountability.

## Known Scope Notes

The ward signals and hospital values are synthetic demonstration data. Credential-dependent FastAPI publisher execution and authenticated external browser execution remain intentionally deferred from the retained scope. The Prometheus endpoint and SSE bridge are implemented and tested, but production alert-rule deployment and long-horizon daily/weekly aggregation are optional follow-up work rather than prerequisites for the current submission.

## Relevant Files

- `client/src/pages/Home.tsx` — dashboard, IPC command center, admin policy form, evidence drawer, and CSV exports.
- `server/routers.ts` — protected IPC transition and admin IPC policy procedures.
- `server/infection-control.ts` — synthetic signal generation and human decision recording.
- `server/db.ts` — IPC policy persistence and audit helpers.
- `drizzle/schema.ts` — `ipcPolicies` and operational telemetry schema.
- `docs/openapi.yaml` — API and export contracts.
- `docs/devpost-description.md` — submission-ready project description.

## Latest IPC Analytics and Workflow Enhancements

The IPC command center now includes a dedicated protected trends procedure with daily and weekly synthetic-facility series. The charts compare open versus completed tasks and escalations versus dismissals, with an explicit synthetic-data label and a responsive Daily/Weekly selector.

The hospital policy editor now tracks a saved baseline, displays an unsaved-changes status, offers a reset action, blocks navigation loss through a browser `beforeunload` warning, and shows success or failure toasts after threshold updates. Invalid critical-at-or-above-watch configurations remain blocked before submission.

The IPC queue now carries structured escalation-reason labels, supports filtering by coverage gap, PPE readiness, environmental cleaning, and training gap, and exports only the currently filtered tasks. The CSV includes an `escalation_reason` column so downstream review retains the reason context.

Validation for this increment passed with 20 Vitest tests, TypeScript, production build, desktop screenshots, and 390×844 mobile screenshots. The charts render with visible lines, the queue filter remains usable on the compact layout, and the policy form stays readable on mobile.

## Latest IPC Sharing and Search Enhancements

The IPC trend panel now supports custom date ranges over stable ISO-dated daily and weekly synthetic samples. Users can reset the range, switch between daily and weekly views, and receive a clear empty-state message when no samples fall within the selected interval.

The chart panel can be downloaded as a PNG or PDF snapshot. Exports include the selected trend mode, date range, chart legends, and visible governance labeling, and complete with success or failure feedback.

The IPC task queue now exposes stable task IDs and a keyword search field. Search matches task IDs, task names, reason codes, and human-readable escalation reasons, and combines with the existing reason selector. CSV export continues to include only the currently filtered tasks and now includes `task_id`.

Validation for this increment passed with 20 Vitest tests, TypeScript, production build, desktop visual verification, and narrow mobile visual verification after a responsive Recharts sizing adjustment.
