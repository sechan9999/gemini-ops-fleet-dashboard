export function getOpenApiDocument() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Gemini Ops Fleet Governance API",
      version: "1.0.0",
      description: "Governed healthcare agent operations, realtime notifications, fleet-event ingestion, and Prometheus metrics.",
    },
    servers: [{ url: "/", description: "Current deployment origin" }],
    paths: {
      "/healthz": { get: { summary: "Liveness probe", operationId: "healthz", responses: { "200": { description: "Server is running" } } } },
      "/openapi.json": { get: { summary: "Retrieve the OpenAPI document", operationId: "getOpenApiDocument", responses: { "200": { description: "OpenAPI document" } } } },
      "/api/notifications/stream": { get: { summary: "Subscribe to operator notifications", description: "Authenticated Server-Sent Events stream scoped to the current operator.", responses: { "200": { description: "text/event-stream" }, "401": { description: "Authentication required" } } } },
      "/api/notifications/metrics": { get: { summary: "Read administrator notification metrics", responses: { "200": { description: "Current stream and fleet-bridge counters" }, "401": { description: "Authentication required" }, "403": { description: "Administrator role required" } } } },
      "/api/notifications/fleet-events": { post: { summary: "Ingest authenticated production fleet events", security: [{ fleetEventToken: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/FleetEventEnvelope" } } } }, responses: { "202": { description: "Accepted for persistence and SSE publication" }, "400": { description: "Invalid event payload" }, "401": { description: "Invalid shared token" } } } },
      "/metrics": { get: { summary: "Scrape Prometheus operational metrics", security: [{ prometheusToken: [] }, { sessionCookie: [] }], responses: { "200": { description: "Prometheus text exposition" }, "401": { description: "Authentication required" } } } },
      "/api/trpc": { post: { summary: "Execute typed dashboard procedures", description: "tRPC batch endpoint for the concrete procedures listed in x-trpc-procedures.", security: [{ sessionCookie: [] }], responses: { "200": { description: "tRPC response envelope" }, "401": { description: "Authentication required" } } } },
    },
    "x-trpc-procedures": {
      public: ["auth.me", "auth.logout"],
      protected: ["fleet.profile", "fleet.snapshot", "fleet.approvalsPage", "fleet.notifications", "fleet.markNotificationsRead", "fleet.notificationPreferences", "fleet.updateNotificationPreferences", "fleet.telemetry", "fleet.transition", "fleet.summarize"],
      admin: ["admin.profiles", "admin.streamMetrics", "admin.roleChanges", "admin.bulkDryRun", "admin.updateProfile", "admin.bulkUpdateProfiles"],
      inputContracts: {
        "fleet.approvalsPage": "page, pageSize, state, priority, query, sort",
        "fleet.transition": "id, action=approve|reject|send, reason required for reject",
        "fleet.summarize": "id",
        "admin.streamMetrics": "range=1h|6h|24h|7d",
        "admin.bulkDryRun": "userIds, dashboardRole, department, initials",
        "admin.roleChanges": "page, pageSize, query, newRole, from, to"
      }
    },
    components: {
      securitySchemes: {
        sessionCookie: { type: "apiKey", in: "cookie", name: "manus_session" },
        fleetEventToken: { type: "apiKey", in: "header", name: "X-Fleet-Event-Token" },
        prometheusToken: { type: "apiKey", in: "header", name: "X-Prometheus-Token" },
      },
      schemas: {
        FleetEventEnvelope: { type: "object", required: ["events"], properties: { events: { type: "array", items: { $ref: "#/components/schemas/FleetEvent" } } } },
        FleetEvent: { type: "object", required: ["eventId", "eventType", "occurredAt", "operatorId"], properties: { eventId: { type: "string" }, eventType: { type: "string", enum: ["role_changed", "department_changed"] }, occurredAt: { type: "string", format: "date-time" }, operatorId: { type: "string" }, operatorName: { type: "string" }, beforeRole: { type: "string" }, afterRole: { type: "string" }, beforeDepartment: { type: "string" }, afterDepartment: { type: "string" }, metadata: { type: "object", additionalProperties: true } } },
      },
    },
  };
}
