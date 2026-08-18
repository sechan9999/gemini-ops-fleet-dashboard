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
