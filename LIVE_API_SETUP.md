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
