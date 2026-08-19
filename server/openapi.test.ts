import { describe, expect, it } from "vitest";
import { getOpenApiDocument } from "./openapi";

describe("OpenAPI document", () => {
  it("describes the public health and documentation routes", () => {
    const document = getOpenApiDocument();
    expect(document.openapi).toBe("3.0.3");
    expect(document.paths["/healthz"]).toBeDefined();
    expect(document.paths["/openapi.json"]).toBeDefined();
    expect(document.paths["/api/trpc"]).toBeDefined();
  });

  it("describes protected realtime, ingestion, and metrics contracts", () => {
    const document = getOpenApiDocument();
    expect(document.paths["/api/notifications/stream"]).toBeDefined();
    expect(document.paths["/api/notifications/fleet-events"]).toBeDefined();
    expect(document.paths["/metrics"]).toBeDefined();
    expect(document.components.securitySchemes.fleetEventToken.name).toBe("X-Fleet-Event-Token");
    expect(document.components.securitySchemes.prometheusToken.name).toBe("X-Prometheus-Token");
    expect(document["x-trpc-procedures"].protected).toContain("fleet.approvalsPage");
    expect(document["x-trpc-procedures"].protected).toContain("fleet.infectionControl");
    expect(document["x-trpc-procedures"].admin).toContain("admin.bulkDryRun");
    expect(document["x-trpc-procedures"].inputContracts["admin.streamMetrics"]).toContain("7d");
  });
});
