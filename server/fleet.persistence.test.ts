import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { upsertOperatorProfile } from "./db";
import type { TrpcContext } from "./_core/context";

function context(id: number, name: string, role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: { id, openId: `persistence-test-${id}`, email: `${id}@example.com`, name, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
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

  it("uses server-side pagination and indexed search inputs", async () => {
    const caller = appRouter.createCaller(context(1, "Dr. HK Chun"));
    const result = await caller.fleet.approvalsPage({ page: 1, pageSize: 1, query: "hash_pt_3312" });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.rows.length).toBeLessThanOrEqual(1);
    expect(result.rows[0]?.id).toBe("apr-047");
  });

  it("returns persisted runtime, agent, and event telemetry", async () => {
    const caller = appRouter.createCaller(context(1, "Dr. HK Chun"));
    const telemetry = await caller.fleet.telemetry();
    expect(telemetry.runtime[0]?.model).toBe("gemini-3.5-flash");
    expect(telemetry.agents.length).toBeGreaterThanOrEqual(4);
    expect(telemetry.events.length).toBeGreaterThan(0);
  });

  it("records bulk role edits in the administrator audit log", async () => {
    const admin = appRouter.createCaller(context(9, "Platform Admin", "admin"));
    await admin.admin.bulkUpdateProfiles({ userIds: [2, 3], dashboardRole: "data_scientist", department: "Clinical analytics", initials: "OP" });
    const updated = await admin.admin.bulkUpdateProfiles({ userIds: [2, 3], dashboardRole: "payer_operations", department: "Payer operations", initials: "PO" });
    expect(updated).toHaveLength(2);
    const changes = await admin.admin.roleChanges({ limit: 20 });
    expect(changes.some((entry) => entry.newRole === "payer_operations" && entry.actorName === "Platform Admin")).toBe(true);
    await admin.admin.bulkUpdateProfiles({ userIds: [2, 3], dashboardRole: "data_scientist", department: "Clinical analytics", initials: "OP" });
  });

  it("allows only admins to manage operator roles", async () => {
    const nonAdmin = appRouter.createCaller(context(1, "Dr. HK Chun"));
    await expect(nonAdmin.admin.profiles()).rejects.toThrow();
    const admin = appRouter.createCaller(context(9, "Platform Admin", "admin"));
    const profiles = await admin.admin.profiles();
    expect(profiles.length).toBeGreaterThan(0);
    const updated = await admin.admin.updateProfile({ userId: 3, dashboardRole: "payer_operations", department: "Payer operations", initials: "PO" });
    expect(updated?.dashboardRole).toBe("payer_operations");
    await admin.admin.updateProfile({ userId: 3, dashboardRole: "data_scientist", department: "Clinical governance", initials: "MD" });
  });
});
