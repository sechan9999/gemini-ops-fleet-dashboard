# Live FastAPI connection

Set `VITE_FLEET_API_URL` to the deployed Gemini Ops Fleet FastAPI base URL and `VITE_FLEET_TOKEN` to the operator token in the web project’s environment settings. Do not commit either value to source control. The FastAPI service must allow the dashboard origin through CORS and must accept the operator token through `X-Fleet-Token`.

The dashboard calls the following endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /fleet/profile` | Returns server-derived employee ID, name, role, dashboard role, department, and initials. |
| `GET /fleet/registry` | Loads the approved agent catalogue. |
| `GET /fleet/approvals` | Loads approval requests visible to the authenticated operator. |
| `GET /fleet/events` | Loads the asynchronous event stream. |
| `GET /fleet/audit` | Loads audit and refusal telemetry. |
| `POST /fleet/approvals/{id}/summary` | Generates a short Gemini explanation from the server-authorized synthetic draft. |
| `POST /fleet/approvals/{id}/approve` | Records a human approval. |
| `POST /fleet/approvals/{id}/reject` | Requires `{ "reason": "..." }`, records a human rejection, persists the reason, creates an audit row, and removes the request from the active pending queue. |
| `POST /fleet/approvals/{id}/send` | Sends only after approval; pending or rejected requests must return HTTP 409. |
| `POST /fleet/events/drain` | Requests a local/demo outbox drain. |

When the API URL is absent or unavailable, the dashboard falls back to clearly structured synthetic demo data. The sidebar marks whether the operator profile came from the server or demo mode, and live mode must never be inferred from a successful page load alone.

## Dashboard role mapping

The backend profile endpoint maps existing Fleet roles into dashboard roles without trusting browser input:

| Fleet role | Dashboard role | Dashboard behavior |
|---|---|---|
| `manager` | `medical_director` | Full registry, events, approvals, audit, approve, and send authority. |
| `accounting` | `payer_operations` | Payer-scoped approvals and audit; approve and send payer actions. |
| `sales` or `support` | `data_scientist` | Overview, registry, events, and scoped audit; no approval or send authority. |

For a production healthcare deployment, replace this demonstration mapping with an explicit organization-level role/permission policy in the backend. The browser should continue receiving permissions from the server-derived profile rather than accepting a role selector.

The rejection fields and reason are added non-destructively during database initialization for existing deployments. Confirm the migration in staging before production rollout and back up the approval table before deploying the schema change. The frontend detail drawer displays the complete server-authorized clinical payload and Gemini summary, while the approval queue CSV export includes only the currently filtered and sorted rows.

## Realtime notifications and bulk dry-run

The full-stack deployment exposes `GET /api/notifications/stream` as an authenticated Server-Sent Events endpoint. The dashboard opens this stream with the session cookie and listens for `notification` events; the server emits heartbeat events to keep the connection alive. Persistent inbox records are available through `fleet.notifications`, with `fleet.markNotificationsRead` for read state. User preferences are available through `fleet.notificationPreferences` and `fleet.updateNotificationPreferences`.

Before an administrator commits a bulk role change, the dashboard calls `admin.bulkDryRun` with the selected user IDs and proposed role, department, and initials. The response identifies changed and unchanged users. Only the explicit confirmation action calls `admin.bulkUpdateProfiles`, so unchanged users do not produce audit rows or notifications.


## Production FastAPI event publisher bridge

The dashboard accepts authenticated role or department events from the production FastAPI fleet publisher at `POST /api/notifications/fleet-events`. The publisher must send the shared `FLEET_EVENT_INGEST_TOKEN` in `X-Fleet-Event-Token`. The bridge accepts a single event, an `{ "events": [...] }` envelope, or a FastAPI `{ "activities": [...] }` envelope. A role-change event should include `event_id` or `id`, `user_id` or `operator_id`, `event_type`, `role`, `department`, and optional `actor` and `name` fields. Duplicate event IDs are ignored, non-role events are acknowledged but not persisted, and valid events create a durable inbox notification that is immediately fanned out through SSE.

Example payload:

```json
{
  "event_id": "role-change-2048",
  "event_type": "operator.role_changed",
  "user_id": 42,
  "name": "Operator 42",
  "actor": "Platform Admin",
  "previous_role": "data_scientist",
  "role": "medical_director",
  "previous_department": "Clinical analytics",
  "department": "Clinical governance",
  "timestamp": "2026-08-18T21:30:00Z"
}
```

The protected `GET /api/notifications/metrics` endpoint returns in-memory process metrics for active and total SSE connections, delivered notifications, dropped clients, delivery latency, bridge receipts, duplicates, ignored events, and failed publications. It is restricted to authenticated administrators. These counters are operational process metrics and should be scraped or forwarded to the organization’s monitoring system for long-term retention.

The browser-level coverage is in `browser-tests/notifications.spec.ts`. Run it with `E2E_BASE_URL` and an authenticated `E2E_SESSION_COOKIE`; it intercepts the SSE stream in Chromium and verifies that the notification toast renders the event title and message.


## Prometheus metrics and operational view

The dashboard exposes `GET /metrics` in Prometheus text exposition format. Prometheus scrapers should send `X-Prometheus-Token` when `PROMETHEUS_METRICS_TOKEN` is configured. Without that token, the endpoint accepts an authenticated admin session; unauthenticated and non-admin requests are rejected. The endpoint contains only process-level operational counters and gauges, including `gemini_ops_sse_active_connections`, `gemini_ops_sse_delivery_latency_ms`, `gemini_ops_sse_delivery_latency_max_ms`, `gemini_ops_sse_notifications_delivered_total`, `gemini_ops_sse_dropped_clients_total`, and the `gemini_ops_fleet_events_*` bridge counters.

Administrators can inspect the same protected JSON data through `admin.streamMetrics` in the Operator admin view. The Notification stream health panel refreshes every five seconds, shows active connections, latest and peak delivery latency, delivered notifications, dropped clients, and bridge receipt/publication/duplicate/ignored counts. The panel is intentionally restricted to the server-authorized admin surface rather than exposing internal operational telemetry to ordinary operators.


## Stream trend analytics

The protected `admin.streamMetrics` procedure accepts `1h`, `6h`, `24h`, or `7d` and returns the current operational counters plus durable `history` points from `operationalMetricSnapshots`. A current sample is captured when an administrator requests the metrics view, allowing the existing five-second admin refresh to build a durable trend without an in-process server timer. The additive migration `0005_free_pixie.sql` creates the snapshot table and captured-time index.

The admin panel renders separate connection and delivery-latency line charts. Latency uses a 500 ms watch threshold and a 1,000 ms critical threshold; dropped clients are healthy at zero, watch when one through four are present, and critical at five or more. The status chips, metric card tones, latency reference lines, and chart stroke all use the same threshold interpretation.

## Infection-control command contract

The protected `fleet.infectionControl` procedure returns synthetic facility-level ward signals and IPC task priorities for the Infection Control command view. Each signal includes a ward, operational observation, freshness, accountable owner, evidence text, proposed verification step, and visible resource constraint. The response also declares `syntheticOnly: true`, `autonomousDeclarations: false`, and `humanApprovalRequired: true`.

The UI supports an explicit low-resource mode that narrows attention to urgent and watch signals. It does not infer that missing data is safe, declare an outbreak, diagnose infection, recommend treatment, or send an external notice. Any escalation or policy change remains behind the existing authenticated human approval and audit boundaries. See `docs/infection-control-product-notes.md` for the product rationale and primary CDC/WHO sources.
