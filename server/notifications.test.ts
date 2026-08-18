import { describe, expect, it } from "vitest";
import { openNotificationStream, publishNotification } from "./notifications";

describe("notification SSE registry", () => {
  it("delivers notifications only to the matching operator stream", () => {
    const matchingWrites: string[] = [];
    const otherWrites: string[] = [];
    const matchingResponse = { write: (value: string) => { matchingWrites.push(value); return true; } } as any;
    const otherResponse = { write: (value: string) => { otherWrites.push(value); return true; } } as any;
    const closeMatching = openNotificationStream(42, matchingResponse);
    const closeOther = openNotificationStream(7, otherResponse);

    publishNotification({ id: 11, userId: 42, kind: "role_change", title: "Dashboard access updated", message: "Role updated.", readAt: null, createdAt: new Date("2026-08-18T21:00:00.000Z") });

    expect(matchingWrites.some((value) => value.includes("event: notification") && value.includes("Dashboard access updated"))).toBe(true);
    expect(otherWrites.some((value) => value.includes("Dashboard access updated"))).toBe(false);
    closeMatching();
    closeOther();
  });
});
