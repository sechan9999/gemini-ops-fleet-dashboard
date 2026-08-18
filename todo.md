# Task list

- [x] Confirm persistence model for approvals, audit entries, operator profiles, and Gemini summaries.
- [x] Upgrade the static project to full-stack database capabilities.
- [x] Implement durable database schema and server APIs.
- [x] Migrate dashboard reads and mutations from demo-only state to persisted data.
- [x] Verify migrations, authorization boundaries, build, and representative workflows.

- [x] Replace the local summary fallback with the server-side Gemini persistence procedure.
- [x] Add transition authorization and rejection-reason tests for the database-backed API.
- [x] Document that approvals, audit history, operator profiles, and summaries are persisted while runtime/agent/event telemetry remains sourced from the fleet API or demo fallback.
- [x] Exercise a persisted approval transition end to end against the managed database.

- [x] Define admin-only role assignment and operator profile management contracts.
- [x] Add indexed approval queries with server-side page and page-size parameters.
- [x] Add durable runtime, agent registry, and event telemetry tables and APIs.
- [x] Build the authenticated admin dashboard for operator profiles and roles.
- [x] Replace client-side approval pagination with server-side pagination.
- [x] Update and validate the reusable agentic governance dashboard skill.
- [x] Run migrations, tests, build, visual verification, and save a new checkpoint.

- [x] Re-read the updated governance dashboard skill and current admin contracts.
- [x] Add durable role-change audit records and protected admin procedures.
- [x] Add role and department distribution charts.
- [x] Add multi-user bulk role assignment with server-side authorization.
- [x] Add admin role-change audit log interface.
- [x] Verify charts, bulk editing, audit persistence, tests, build, and visual layout.
- [x] Save the updated dashboard checkpoint and deliver the skill package.

- [x] Add a direct admin-view entry point for staging verification.
- [x] Visually verify charts, bulk selection, and role-change audit history in the admin view.
- [x] Save and deliver a fresh checkpoint containing the latest admin UI changes.

- [x] Define bulk-edit confirmation preview and protected commit contract.
- [x] Add role-change audit filtering and date-range pagination contracts.
- [x] Persist operator role/department notifications and expose protected read procedures.
- [x] Build before/after bulk-edit confirmation dialog.
- [x] Add audit filters and date-range pagination UI.
- [x] Add real-time notification polling and toast alerts.
- [x] Verify tests, responsive UI, and save a new checkpoint.

- [x] Define SSE delivery, notification inbox, preference, and bulk dry-run contracts.
- [x] Add durable notification preferences and inbox state.
- [x] Add protected SSE notification endpoint and frontend subscription.
- [x] Replace polling and retain toast delivery from SSE events.
- [x] Add notification inbox and preference controls.
- [x] Add admin bulk-change dry-run procedure and confirmation preview integration.
- [x] Verify realtime delivery, authorization, persistence, tests, build, and responsive UI.
- [x] Save and deliver a new checkpoint.

- [x] Add a direct `?inbox=1` staging entry point for notification inbox verification.
- [x] Verify the inbox, preferences, SSE-ready notification indicator, and dry-run preview on desktop and mobile.
- [x] Save and deliver the realtime notification checkpoint.
- [x] Add focused SSE registry delivery and user-isolation test coverage.
- [x] Verify unauthenticated `/api/notifications/stream` requests return HTTP 401 in the running staging server.
- [x] Add the authenticated FastAPI-to-dashboard role-change event bridge and durable SSE publication contract.
- [x] Add browser-level Playwright coverage for authenticated SSE delivery and toast rendering; credentialed execution remains pending.
- [x] Add protected operational metrics for stream connections, delivery latency, dropped clients, and bridge ingestion.
- [x] Prepare the corrected Gemini Ops Fleet README as a downloadable file.
- [x] Configure `FLEET_EVENT_INGEST_TOKEN` and run the production publisher against staging. Deferred by user; credential-dependent staging execution intentionally dropped from scope.
- [x] Execute the authenticated Playwright test with `E2E_SESSION_COOKIE` against staging. Deferred by user; credential-dependent staging execution intentionally dropped from scope.
- [x] Add a Prometheus-compatible endpoint for SSE and fleet bridge operational metrics.
- [x] Add a protected frontend operational metrics view for live connections and delivery latency.
- [x] Test, document, and checkpoint the Prometheus metrics feature.
- [x] Persist operational metric snapshots for connection and latency trend analysis.
- [x] Add time-range filtering to the protected stream metrics contract.
- [x] Add responsive connection and latency trend charts to the admin dashboard.
- [x] Add threshold-based color-coded status indicators and verify the trend analytics feature.
