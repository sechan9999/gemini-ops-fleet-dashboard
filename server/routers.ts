import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addAuditEntry, createOperatorNotification, ensureFleetSeeded, getApprovalRequest, getNotificationPreferences, getOperatorProfile, getUserById, listApprovalRequests, listApprovalRequestsPage, listAuditEntries, listOperatorNotifications, listOperatorProfiles, listRoleChanges, listTelemetry, listOperationalMetricSnapshots, listIpcTasks, markOperatorNotificationsRead, recordOperationalMetricSnapshot, recordRoleChange, updateApprovalRequest, updateIpcTasks, upsertIpcPolicy, upsertNotificationPreferences, upsertOperatorProfile, getIpcPolicy } from "./db";
import { getFleetEventBridgeMetrics } from "./fleet-event-bridge";
import { getNotificationStreamMetrics } from "./notifications";
import { getInfectionControlOverview, getInfectionControlTrends, recordInfectionControlDecision, recordInfectionControlTaskUpdate } from "./infection-control";

const dashboardRole = z.enum(["data_scientist", "medical_director", "payer_operations"]);
const actionInput = z.object({ id: z.string().min(1), action: z.enum(["approve", "reject", "send"]), reason: z.string().optional() });

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "OP";
}

async function profileFor(user: { id: number; name: string | null }) {
  const existing = await getOperatorProfile(user.id);
  if (existing) return existing;
  return upsertOperatorProfile({ userId: user.id, dashboardRole: "data_scientist", department: "Clinical analytics", initials: initials(user.name || "Operator") });
}

function normalizedApproval(row: Awaited<ReturnType<typeof listApprovalRequests>>[number]) {
  return {
    id: row.id, actionType: row.actionType, state: row.state, priority: row.priority, agent: row.agent, domain: row.domain, subject: row.subject, summary: row.summary,
    payload: row.payload as Record<string, string>, evidence: row.evidence as string[], aiSummary: row.aiSummary || undefined,
    approvedBy: row.approvedBy || undefined, rejectedBy: row.rejectedBy || undefined, rejectionReason: row.rejectionReason || undefined, createdAt: row.createdAt.toISOString(),
  };
}

function normalizedProfile(row: Awaited<ReturnType<typeof listOperatorProfiles>>[number]) {
  return { userId: row.profile.userId, name: row.user?.name || `User ${row.profile.userId}`, email: row.user?.email || "", openId: row.user?.openId || "", dashboardRole: row.profile.dashboardRole, department: row.profile.department || "", initials: row.profile.initials || "" };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  fleet: router({
    profile: protectedProcedure.query(async ({ ctx }) => {
      const profile = await profileFor(ctx.user);
      return { employeeId: ctx.user.id, name: ctx.user.name || "Operator", role: profile?.dashboardRole || "data_scientist", roleLabel: ({ data_scientist: "Data Scientist", medical_director: "Medical Director", payer_operations: "Payer Operations" } as const)[profile?.dashboardRole || "data_scientist"], department: profile?.department || "Clinical analytics", initials: profile?.initials || initials(ctx.user.name || "Operator"), source: "database" as const, isAdmin: ctx.user.role === "admin" };
    }),
    snapshot: protectedProcedure.query(async () => { await ensureFleetSeeded(); const [approvals, audit] = await Promise.all([listApprovalRequests(), listAuditEntries()]); return { approvals: approvals.map(normalizedApproval), audit: audit.map((entry) => ({ id: String(entry.id), actor: entry.actor, role: entry.role, tool: entry.tool, outcome: entry.outcome as "allowed" | "denied" | "blocked" | "approved" | "rejected" | "sent", detail: entry.detail, timestamp: entry.createdAt.toISOString() })) }; }),
    approvalsPage: protectedProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20), state: z.enum(["pending", "approved", "rejected", "sent"]).optional(), priority: z.enum(["high", "medium", "low"]).optional(), query: z.string().optional(), sort: z.enum(["newest", "oldest", "priority"]).default("newest") }).optional()).query(async ({ input, ctx }) => {
      const profile = await profileFor(ctx.user);
      const result = await listApprovalRequestsPage(input?.page || 1, input?.pageSize || 20, input?.state, input?.priority, input?.query, input?.sort || "newest");
      const rows = profile?.dashboardRole === "payer_operations" ? result.rows.filter((row) => row.domain === "Payer operations") : result.rows;
      return { rows: rows.map(normalizedApproval), total: profile?.dashboardRole === "payer_operations" ? rows.length : result.total, page: input?.page || 1, pageSize: input?.pageSize || 20 };
    }),
    notifications: protectedProcedure.query(async ({ ctx }) => (await listOperatorNotifications(ctx.user.id)).map((item) => ({ id: item.id, kind: item.kind, title: item.title, message: item.message, readAt: item.readAt?.toISOString() || null, createdAt: item.createdAt.toISOString() }))),
    markNotificationsRead: protectedProcedure.mutation(async ({ ctx }) => { await markOperatorNotificationsRead(ctx.user.id); return { success: true }; }),
    notificationPreferences: protectedProcedure.query(async ({ ctx }) => { const prefs = await getNotificationPreferences(ctx.user.id); return { roleChanges: prefs?.roleChanges ?? true, adminActions: prefs?.adminActions ?? true, toastEnabled: prefs?.toastEnabled ?? true }; }),
    updateNotificationPreferences: protectedProcedure.input(z.object({ roleChanges: z.boolean(), adminActions: z.boolean(), toastEnabled: z.boolean() })).mutation(async ({ ctx, input }) => { const prefs = await upsertNotificationPreferences({ userId: ctx.user.id, ...input }); return { roleChanges: prefs?.roleChanges ?? input.roleChanges, adminActions: prefs?.adminActions ?? input.adminActions, toastEnabled: prefs?.toastEnabled ?? input.toastEnabled }; }),
    infectionControl: protectedProcedure.query(async () => { const overview = getInfectionControlOverview(); const tasks = await listIpcTasks(); return { ...overview, tasks: tasks.length ? tasks.map((task) => ({ id: task.id, label: task.label, count: task.count, tone: task.tone, priority: task.priority, status: task.status, kind: task.kind, reason: task.reason })) : overview.tasks }; }),
    infectionControlTrends: protectedProcedure.input(z.object({ from: z.string().optional(), to: z.string().optional() }).optional()).query(async ({ input }) => getInfectionControlTrends(input)),
    infectionControlTransition: protectedProcedure.input(z.object({ signal: z.string().min(1), action: z.enum(["verify", "escalate", "dismiss"]), reason: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const profile = await profileFor(ctx.user);
      const decision = await recordInfectionControlDecision({ actor: ctx.user.name || "Operator", role: profile?.dashboardRole, signal: input.signal, action: input.action, reason: input.reason, writeAudit: addAuditEntry });
      return { ...decision, recordedAt: new Date().toISOString() };
    }),
    infectionControlTaskBulkUpdate: protectedProcedure.input(z.object({ taskIds: z.array(z.string().min(1)).min(1).max(50), priority: z.enum(["high", "medium", "low"]).optional(), status: z.enum(["open", "in_progress", "completed"]).optional() })).mutation(async ({ ctx, input }) => {
      const profile = await profileFor(ctx.user);
      return recordInfectionControlTaskUpdate({ ...input, actor: ctx.user.name || "Operator", role: profile?.dashboardRole, writeAudit: addAuditEntry, updateTasks: updateIpcTasks });
    }),
    infectionControlTrendSummary: protectedProcedure.input(z.object({ range: z.enum(["daily", "weekly"]), points: z.array(z.object({ label: z.string(), openTasks: z.number(), completedTasks: z.number(), escalations: z.number(), dismissals: z.number() })).max(14), tasks: z.array(z.object({ id: z.string(), priority: z.enum(["high", "medium", "low"]), status: z.enum(["open", "in_progress", "completed"]), count: z.number() })).max(50) })).mutation(async ({ input }) => {
      const fallback = `The ${input.range} view contains ${input.points.reduce((sum, point) => sum + point.openTasks, 0)} open-task observations and ${input.points.reduce((sum, point) => sum + point.completedTasks, 0)} completed-task observations. Human reviewers recorded ${input.points.reduce((sum, point) => sum + point.escalations, 0)} escalations and ${input.points.reduce((sum, point) => sum + point.dismissals, 0)} dismissals. This synthetic operational signal requires local review.`;
      try {
        const response = await invokeLLM({ messages: [{ role: "system", content: "Summarize synthetic infection-control queue trends for a governed hospital operations dashboard. Return one concise paragraph of 55 words or fewer. Mention workload, human decisions, and uncertainty. Do not diagnose, recommend treatment, invent facility facts, or make an autonomous decision." }, { role: "user", content: JSON.stringify(input) }] });
        const content = response.choices?.[0]?.message?.content;
        return { summary: typeof content === "string" && content.trim() ? content.trim() : fallback, source: "gemini" as const };
      } catch { return { summary: fallback, source: "deterministic_fallback" as const }; }
    }),
    telemetry: protectedProcedure.query(async () => {
      const data = await listTelemetry();
      return { runtime: data.runtime.map((row) => ({ mode: row.mode, model: row.model, database: row.database, guardrail: row.guardrail, pubsub: row.pubsub, trace: row.trace })), agents: data.agents.map((row) => ({ id: row.id, name: row.name, domain: row.domain, version: row.version, autonomy: row.autonomy as "autonomous" | "drafts_only" | "read_only", capabilities: row.capabilities as string[], restrictions: row.restrictions as string[], health: row.health as "healthy" | "standby" })), events: data.events.map((row) => ({ id: row.id, kind: row.kind, actor: row.actor, routedTo: row.routedTo, status: row.status as "completed" | "pending" | "blocked", timestamp: row.occurredAt.toISOString(), detail: row.detail })) };
    }),
    transition: protectedProcedure.input(actionInput).mutation(async ({ ctx, input }) => {
      const profile = await profileFor(ctx.user); const approval = await getApprovalRequest(input.id); if (!approval) throw new Error("Approval request not found");
      const canApprove = profile?.dashboardRole === "medical_director" || profile?.dashboardRole === "payer_operations";
      if ((input.action === "approve" || input.action === "reject" || input.action === "send") && !canApprove) throw new Error("This role cannot change approval state");
      if (input.action === "reject" && !input.reason?.trim()) throw new Error("A rejection reason is required");
      if (input.action === "send" && approval.state !== "approved") throw new Error("409: only approved requests can be sent");
      if (profile?.dashboardRole === "payer_operations" && approval.domain !== "Payer operations") throw new Error("This role is scoped to payer operations");
      const nextState = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "sent";
      const updated = await updateApprovalRequest(input.id, { state: nextState, approvedBy: input.action === "approve" ? ctx.user.name || "Operator" : approval.approvedBy, rejectedBy: input.action === "reject" ? ctx.user.name || "Operator" : approval.rejectedBy, rejectionReason: input.action === "reject" ? input.reason?.trim() : approval.rejectionReason });
      await addAuditEntry({ approvalId: input.id, actor: ctx.user.name || "Operator", role: profile?.dashboardRole || "data_scientist", tool: input.action, outcome: input.action === "send" ? "sent" : input.action === "approve" ? "approved" : "rejected", detail: input.action === "reject" ? `Request rejected. Reason: ${input.reason?.trim()}` : input.action === "approve" ? "Human approval recorded." : "Approved request dispatched." });
      return updated ? normalizedApproval(updated) : null;
    }),
    summarize: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      const approval = await getApprovalRequest(input.id); if (!approval) throw new Error("Approval request not found");
      const response = await invokeLLM({ messages: [{ role: "system", content: "Summarize synthetic or explicitly permitted clinical workflow data for a human approval queue. Return one concise paragraph of 40 words or fewer. Explain the observed signal, operational implication, and uncertainty. Do not diagnose, recommend treatment, invent facts, or make the approval decision." }, { role: "user", content: `Request: ${approval.summary}\nSubject: ${approval.subject}\nEvidence: ${JSON.stringify(approval.evidence)}\nServer-authorized clinical payload: ${JSON.stringify(approval.payload)}` }] });
      const content = response.choices?.[0]?.message?.content; const summary = typeof content === "string" ? content.trim() : `The request concerns ${approval.subject} and requires human review of the supplied evidence before any operational action.`;
      const updated = await updateApprovalRequest(input.id, { aiSummary: summary }); return updated ? normalizedApproval(updated) : null;
    }),
  }),
  admin: router({
    profiles: adminProcedure.query(async () => (await listOperatorProfiles()).map(normalizedProfile)),
    ipcPolicy: adminProcedure.input(z.object({ facilityId: z.string().min(1).max(80).default("default-hospital") }).optional()).query(async ({ input }) => {
      const policy = await getIpcPolicy(input?.facilityId || "default-hospital");
      return policy ? { ...policy, createdAt: policy.createdAt.toISOString(), updatedAt: policy.updatedAt.toISOString() } : null;
    }),
    updateIpcPolicy: adminProcedure.input(z.object({ facilityId: z.string().min(1).max(80), facilityName: z.string().min(1).max(180), handHygieneWatchPct: z.number().int().min(1).max(100), handHygieneCriticalPct: z.number().int().min(1).max(100), evidenceStaleMinutes: z.number().int().min(5).max(10080), ppeStaleHours: z.number().int().min(1).max(720), urgentNotifications: z.boolean(), watchNotifications: z.boolean(), lowResourceDefault: z.boolean() })).mutation(async ({ ctx, input }) => {
      if (input.handHygieneCriticalPct >= input.handHygieneWatchPct) throw new Error("Critical coverage must be lower than watch coverage");
      const policy = await upsertIpcPolicy({ ...input, updatedBy: ctx.user.name || "Administrator" });
      return policy ? { ...policy, createdAt: policy.createdAt.toISOString(), updatedAt: policy.updatedAt.toISOString() } : null;
    }),
    streamMetrics: adminProcedure.input(z.object({ range: z.enum(["1h", "6h", "24h", "7d"]).default("24h") }).optional()).query(async ({ input }) => {
      const range = input?.range || "24h";
      const durationMs = range === "1h" ? 60 * 60 * 1000 : range === "6h" ? 6 * 60 * 60 * 1000 : range === "7d" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const stream = getNotificationStreamMetrics();
      const fleetBridge = getFleetEventBridgeMetrics();
      await recordOperationalMetricSnapshot({ activeConnections: stream.activeConnections, deliveryLatencyMs: stream.deliveryLatencyMs, maxDeliveryLatencyMs: stream.maxDeliveryLatencyMs, deliveredNotifications: stream.deliveredNotifications, totalNotifications: stream.totalNotifications, droppedClients: stream.droppedClients, bridgeReceived: fleetBridge.received, bridgePublished: fleetBridge.published, bridgeFailed: fleetBridge.failed });
      const history = await listOperationalMetricSnapshots(new Date(Date.now() - durationMs));
      return { range, stream, fleetBridge, history: history.map((point) => ({ capturedAt: point.capturedAt.toISOString(), activeConnections: point.activeConnections, deliveryLatencyMs: point.deliveryLatencyMs, maxDeliveryLatencyMs: point.maxDeliveryLatencyMs, deliveredNotifications: point.deliveredNotifications, totalNotifications: point.totalNotifications, droppedClients: point.droppedClients, bridgeReceived: point.bridgeReceived, bridgePublished: point.bridgePublished, bridgeFailed: point.bridgeFailed })) };
    }),
    roleChanges: adminProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(50).default(10), query: z.string().optional(), newRole: dashboardRole.optional(), from: z.string().optional(), to: z.string().optional() }).optional()).query(async ({ input }) => { const result = await listRoleChanges(input || {}); return { rows: result.rows.map((entry) => ({ id: entry.id, targetUserId: entry.targetUserId, actorUserId: entry.actorUserId, actorName: entry.actorName, targetName: entry.targetName, previousRole: entry.previousRole, newRole: entry.newRole, previousDepartment: entry.previousDepartment || "", newDepartment: entry.newDepartment || "", createdAt: entry.createdAt.toISOString() })), total: result.total, page: input?.page || 1, pageSize: input?.pageSize || 10 }; }),
    bulkDryRun: adminProcedure.input(z.object({ userIds: z.array(z.number().int().positive()).min(1).max(100), dashboardRole, department: z.string().max(120), initials: z.string().max(8) })).query(async ({ input }) => { const profiles = await listOperatorProfiles(); const selected = profiles.filter((item) => input.userIds.includes(item.profile.userId)).map((item) => ({ userId: item.profile.userId, name: item.user?.name || `User ${item.profile.userId}`, currentRole: item.profile.dashboardRole, currentDepartment: item.profile.department || "", nextRole: input.dashboardRole, nextDepartment: input.department, changed: item.profile.dashboardRole !== input.dashboardRole || (item.profile.department || "") !== input.department })); return { rows: selected, changedCount: selected.filter((item) => item.changed).length, unchangedCount: selected.filter((item) => !item.changed).length }; }),
    updateProfile: adminProcedure.input(z.object({ userId: z.number().int().positive(), dashboardRole, department: z.string().max(120), initials: z.string().max(8) })).mutation(async ({ ctx, input }) => {
      const previous = await getOperatorProfile(input.userId); const target = await getUserById(input.userId); const updated = await upsertOperatorProfile(input);
      if (updated && previous && (previous.dashboardRole !== input.dashboardRole || (previous.department || "") !== input.department)) { await recordRoleChange({ targetUserId: input.userId, actorUserId: ctx.user.id, actorName: ctx.user.name || "Administrator", targetName: target?.name || `User ${input.userId}`, previousRole: previous.dashboardRole, newRole: input.dashboardRole, previousDepartment: previous.department || null, newDepartment: input.department }); const prefs = await getNotificationPreferences(input.userId); if (prefs?.roleChanges !== false) await createOperatorNotification({ userId: input.userId, kind: "role_change", title: "Dashboard access updated", message: `Your dashboard role is now ${input.dashboardRole.replaceAll("_", " ")} in ${input.department}.` }); }
      return updated ? { userId: updated.userId, dashboardRole: updated.dashboardRole, department: updated.department, initials: updated.initials } : null;
    }),
    bulkUpdateProfiles: adminProcedure.input(z.object({ userIds: z.array(z.number().int().positive()).min(1).max(100), dashboardRole, department: z.string().max(120), initials: z.string().max(8) })).mutation(async ({ ctx, input }) => {
      const results = [];
      for (const userId of input.userIds) {
        const previous = await getOperatorProfile(userId); const target = await getUserById(userId); const updated = await upsertOperatorProfile({ userId, dashboardRole: input.dashboardRole, department: input.department, initials: input.initials });
        if (updated && previous && (previous.dashboardRole !== input.dashboardRole || (previous.department || "") !== input.department)) { await recordRoleChange({ targetUserId: userId, actorUserId: ctx.user.id, actorName: ctx.user.name || "Administrator", targetName: target?.name || `User ${userId}`, previousRole: previous.dashboardRole, newRole: input.dashboardRole, previousDepartment: previous.department || null, newDepartment: input.department }); const prefs = await getNotificationPreferences(userId); if (prefs?.roleChanges !== false) await createOperatorNotification({ userId, kind: "role_change", title: "Dashboard access updated", message: `Your dashboard role is now ${input.dashboardRole.replaceAll("_", " ")} in ${input.department}.` }); }
        if (updated) results.push({ userId, dashboardRole: updated.dashboardRole, department: updated.department, initials: updated.initials });
      }
      return results;
    }),
  }),
});

export type AppRouter = typeof appRouter;
