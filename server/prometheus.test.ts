import { describe, expect, it } from "vitest";
import { renderPrometheusMetrics } from "./prometheus";

describe("Prometheus metrics exposition", () => {
  it("exposes stream and fleet bridge counters with HELP and TYPE metadata", () => {
    const output = renderPrometheusMetrics();
    expect(output).toContain("# HELP gemini_ops_sse_active_connections");
    expect(output).toContain("# TYPE gemini_ops_sse_active_connections gauge");
    expect(output).toMatch(/gemini_ops_sse_delivery_latency_ms \d+(\.\d+)?/);
    expect(output).toContain("# TYPE gemini_ops_fleet_events_published_total counter");
    expect(output.endsWith("\n")).toBe(true);
  });
});
