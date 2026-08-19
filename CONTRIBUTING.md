# Contributing to Gemini Ops Fleet

## Before opening a change

Read the root `README.md` and the relevant documentation under `docs/`. Keep the Clinical Command Ledger vocabulary consistent with the implemented dashboard and preserve server-side authorization boundaries.

## Local verification

Run the focused checks before committing:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

For UI changes, verify the affected route at desktop and mobile sizes. For governance changes, add or update Vitest coverage for authorization, persistence, refusal behavior, and audit history. Do not treat a screenshot as a substitute for unit tests.

## Data and security

Use synthetic healthcare data only. Never commit real credentials, protected health information, patient identifiers, session cookies, or production tokens. Configure environment variables through the project environment-management workflow and keep local secret files untracked.

## Commit and review expectations

Describe the behavior change in the commit message. Document new endpoints, role boundaries, migrations, and operational metrics in `LIVE_API_SETUP.md` or an appropriate file under `docs/`. If a staging or production verification step requires credentials that are unavailable, record it explicitly instead of claiming it was executed.
