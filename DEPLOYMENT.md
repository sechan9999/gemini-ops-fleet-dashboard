# Gemini Ops Fleet deployment runbook

## Recommended production shape

Use a managed Manus website deployment backed by a managed MySQL or TiDB database. The website process remains stateless; all operator profiles, approvals, audit records, notifications, telemetry, and IPC tasks are stored through Drizzle in the database. The existing Docker Compose file is for local development and uses a persistent `mysql_data` volume; it is not the production database.

| Approach | Tradeoffs | Cost | Setup complexity |
| --- | --- | --- | --- |
| Managed Manus website plus managed MySQL/TiDB | Permanent HTTPS site, managed runtime, database-backed state, and no local machine requirement. Requires owner sign-in and provider-managed secrets. | Depends on the selected hosting and database plans. | Medium |
| Docker Compose on an always-on server | Full control and portable deployment; the operator must maintain the server, TLS, backups, updates, and uptime. | Server and database hosting costs. | Higher |

The first approach is the recommended default for this repository because it matches the existing Manus full-stack template and preserves the current `manus.space` deployment model.

## Required production environment

Configure these as server-side secrets or environment variables in the hosting workspace. Do not commit them to GitHub and do not place them in `client/` files.

```text
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE?sslaccept=strict
JWT_SECRET=<long-random-session-secret>
NODE_ENV=production
PORT=3000
OAUTH_SERVER_URL=<Manus OAuth backend URL>
VITE_APP_ID=<Manus OAuth app ID>
VITE_OAUTH_PORTAL_URL=<Manus login portal URL>
OWNER_OPEN_ID=<owner open ID>
OWNER_NAME=<owner display name>
```

Add `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` if hosted Gemini summaries or other built-in services are enabled. Add `FLEET_EVENT_INGEST_TOKEN` and `PROMETHEUS_METRICS_TOKEN` only when the corresponding protected integrations are used. Keep all tokens in the hosting provider’s secret store.

## Database initialization

Create an empty MySQL 8.0+ or compatible TiDB database and a least-privilege application user. From a trusted machine, set the same `DATABASE_URL` that the hosted app will use, install dependencies, and apply the schema:

```bash
export DATABASE_URL='mysql://USER:PASSWORD@HOST:3306/DATABASE?sslaccept=strict'
pnpm install --frozen-lockfile
pnpm exec drizzle-kit push --force
```

The server’s seed helpers populate the expected synthetic fleet records on first access. Confirm the connection before publishing by running:

```bash
pnpm test
```

The tests must run with `DATABASE_URL` set; otherwise the database helpers intentionally fall back to empty/no-op results and the persistence tests fail.

For local development, use the repository’s Compose database instead:

```bash
docker compose up -d db
export DATABASE_URL='mysql://gemini:gemini_local_password@127.0.0.1:3306/gemini_ops_fleet'
pnpm exec drizzle-kit push --force
pnpm test
```

## Permanent website publication

Sign in to the Manus workspace that owns `geminifleet-c8zuvyxn.manus.space`, complete any human-verification step, and restore the project if the workspace shows a maintenance or restoration screen. Set the production environment variables above, attach the public GitHub repository, and publish the `main` branch. After the first successful deployment, verify the root page, `/healthz`, and `/openapi.json`; then check that a newly created profile or approval remains after a restart.

The repository’s GitHub workflow runs on pull requests and pushes to `main`. It starts MySQL 8.4 as a CI service, applies the schema, runs the complete Vitest suite, typechecks, builds the application, and publishes a Docker image to GHCR only after verification succeeds. This protects `main` from build or persistence regressions. Configure branch protection so pull requests require the workflow’s `verify` job before merge.

## Operational safeguards

Back up the managed database before schema changes, rotate `JWT_SECRET` and integration tokens on a documented schedule, and use separate databases for development, CI, staging, and production. The fixture data is synthetic; never place protected health information or real patient identifiers in this repository, logs, screenshots, or test fixtures.
