# Persistence scope

The managed database now persists the operator profile, approval requests, approval state transitions, rejection reasons, Gemini summaries, and audit history. The dashboard reads these records through protected tRPC procedures backed by Drizzle and MySQL/TiDB.

Runtime metadata, agent registry records, and event-stream telemetry continue to come from the existing Gemini Ops Fleet API when `VITE_FLEET_API_URL` is configured. When that API is not configured, the UI keeps its synthetic demo snapshot for those non-persistent surfaces. This separation is intentional: governance decisions and audit evidence are durable in the website database, while fleet telemetry remains owned by the agent runtime.

The first authenticated snapshot request idempotently seeds two synthetic approval records and three audit entries when the approval table is empty. No real patient data is used by the seed path.
