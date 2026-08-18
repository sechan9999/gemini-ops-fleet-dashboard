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
