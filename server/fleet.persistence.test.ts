import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { upsertOperatorProfile } from "./db";
import type { TrpcContext } from "./_core/context";

function context(id: number, name: string): TrpcContext {
  return {
    user: { id, openId: `persistence-test-${id}`, email: `${id}@example.com`, name, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("fleet persistence", () => {
  it("returns a server-backed operator profile and durable approval snapshot", async () => {
    const caller = appRouter.createCaller(context(1, "Dr. HK Chun"));
    const profile = await caller.fleet.profile();
    const snapshot = await caller.fleet.snapshot();

    expect(profile.source).toBe("database");
    expect(profile.role).toBe("data_scientist");
    expect(snapshot.approvals.length).toBeGreaterThan(0);
    expect(snapshot.approvals[0]).toHaveProperty("createdAt");
    expect(snapshot.audit.length).toBeGreaterThan(0);
  });

  it("enforces role boundaries and requires a rejection reason", async () => {
    const analyst = appRouter.createCaller(context(1, "Dr. HK Chun"));
    await expect(analyst.fleet.transition({ id: "apr-047", action: "approve" })).rejects.toThrow("cannot change approval state");

    await upsertOperatorProfile({ userId: 2, dashboardRole: "medical_director", department: "Clinical governance", initials: "MD" });
    const director = appRouter.createCaller(context(2, "Medical Director"));
    await expect(director.fleet.transition({ id: "apr-047", action: "reject", reason: "   " })).rejects.toThrow("rejection reason is required");
  });

  it("records a successful human approval transition", async () => {
    await upsertOperatorProfile({ userId: 3, dashboardRole: "medical_director", department: "Clinical governance", initials: "MD" });
    const director = appRouter.createCaller(context(3, "Medical Director"));
    const updated = await director.fleet.transition({ id: "apr-047", action: "approve" });
    expect(updated?.state).toBe("approved");
    expect(updated?.approvedBy).toBe("Medical Director");
  });
});
