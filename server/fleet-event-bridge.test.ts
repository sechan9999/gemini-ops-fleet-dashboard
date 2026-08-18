import { describe, expect, it } from "vitest";
import { isFleetEventTokenValid } from "./fleet-event-bridge";

describe("fleet event ingestion authentication", () => {
  it("accepts only the configured shared token", () => {
    expect(isFleetEventTokenValid("fleet-secret", "fleet-secret")).toBe(true);
    expect(isFleetEventTokenValid("wrong-secret", "fleet-secret")).toBe(false);
    expect(isFleetEventTokenValid(undefined, "fleet-secret")).toBe(false);
    expect(isFleetEventTokenValid("fleet-secret", undefined)).toBe(false);
  });
});
