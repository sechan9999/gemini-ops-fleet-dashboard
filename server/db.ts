import { and, asc, count, desc, eq, gte, inArray, lte, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { adminRoleChanges, approvalRequests, auditEntries, fleetAgents, fleetEvents, ipcPolicies, ipcTasks, InsertAdminRoleChange, InsertApprovalRequest, InsertAuditEntry, InsertFleetAgent, InsertFleetEvent, InsertIpcPolicy, InsertIpcTask, InsertNotificationPreferences, InsertOperatorNotification, InsertOperatorProfile, InsertRuntimeTelemetry, InsertUser, notificationPreferences, operatorNotifications, operatorProfiles, operationalMetricSnapshots, runtimeTelemetry, users } from "../drizzle/schema";
import { publishNotification } from "./notifications";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function ensureIpcTasksSeeded() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: ipcTasks.id }).from(ipcTasks).limit(1);
  if (existing.length) return;
  const seed: InsertIpcTask[] = [
    { id: "ipc-precaution-review", label: "Transmission-based precaution review", count: 2, tone: "urgent", priority: "high", status: "open", kind: "precaution", reason: "coverage_gap" },
    { id: "ipc-surface-verification", label: "High-touch surface verification", count: 4, tone: "watch", priority: "medium", status: "open", kind: "cleaning", reason: "environmental_cleaning" },
    { id: "ipc-refresher-training", label: "Frontline refresher training", count: 1, tone: "stable", priority: "low", status: "open", kind: "training", reason: "training_gap" },
  ];
  await db.insert(ipcTasks).values(seed);
}

export async function listIpcTasks() {
  await ensureIpcTasksSeeded();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ipcTasks).orderBy(sql`FIELD(${ipcTasks.priority}, 'high', 'medium', 'low'), ${ipcTasks.updatedAt} DESC`);
}

export async function updateIpcTasks(input: { taskIds: string[]; priority?: "high" | "medium" | "low"; status?: "open" | "in_progress" | "completed"; lastComment?: string; updatedBy: string }) {
  await ensureIpcTasksSeeded();
  const db = await getDb();
  if (!db) return [];
  await db.update(ipcTasks).set({ ...(input.priority ? { priority: input.priority } : {}), ...(input.status ? { status: input.status } : {}), ...(input.lastComment?.trim() ? { lastComment: input.lastComment.trim() } : {}), updatedBy: input.updatedBy }).where(inArray(ipcTasks.id, input.taskIds));
  return db.select().from(ipcTasks).where(inArray(ipcTasks.id, input.taskIds));
}

export async function ensureFleetSeeded() {
  await ensureIpcTasksSeeded();
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: approvalRequests.id }).from(approvalRequests).limit(1);
  if (existing.length) return;
  await db.insert(approvalRequests).values([
    { id: "apr-047", actionType: "PRIOR_AUTH_DRAFT", state: "pending", priority: "high", agent: "Payer Intelligence", domain: "Payer operations", subject: "Synthetic patient hash_pt_3312", summary: "Prior authorization packet for CPT 75561 / ICD-10 I42.0", payload: { cpt: "75561", icd10: "I42.0", rationale: "Synthetic cardiomyopathy case meets policy criteria.", destination: "Payer review queue" }, evidence: ["PAY-POL-101", "PAY-DEN-303"] },
    { id: "apr-046", actionType: "QUALITY_INITIATIVE_DRAFT", state: "approved", priority: "medium", agent: "Clinical & Quality", domain: "Clinical operations", subject: "Synthetic cohort: Type 2 diabetes", summary: "HEDIS care-gap outreach initiative", payload: { measure: "HEDIS-HbA1c", cohort: "Synthetic Type 2 diabetes", destination: "Quality operations inbox" }, evidence: ["CLN-GUIDE-401", "CLN-GROWTH-502"], approvedBy: "Dr. Maya Chen" },
  ]);
  await db.insert(auditEntries).values([
    { actor: "pubsub", role: "system", tool: "dispatch_event", outcome: "allowed", detail: "denial.received → payer-intelligence" },
    { actor: "claims-specialist", role: "payer_ops", tool: "permitted_documents", outcome: "denied", detail: "SQL scope excluded confidential contract-rate document." },
    { actor: "unknown", role: "unknown", tool: "guardrail_plugin", outcome: "blocked", detail: "Prompt injection screened before model execution." },
  ]);
}

export async function listApprovalRequests() {
  await ensureFleetSeeded();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(approvalRequests).orderBy(desc(approvalRequests.createdAt));
}

export async function listApprovalRequestsPage(page: number, pageSize: number, state?: string, priority?: string, query?: string, sort: "newest" | "oldest" | "priority" = "newest") {
  await ensureFleetSeeded();
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const filters = [state ? eq(approvalRequests.state, state as "pending" | "approved" | "rejected" | "sent") : undefined, priority ? eq(approvalRequests.priority, priority as "high" | "medium" | "low") : undefined, query?.trim() ? or(like(approvalRequests.id, `%${query.trim()}%`), like(approvalRequests.subject, `%${query.trim()}%`), like(approvalRequests.summary, `%${query.trim()}%`), like(approvalRequests.agent, `%${query.trim()}%`), like(approvalRequests.domain, `%${query.trim()}%`)) : undefined].filter(Boolean) as Array<ReturnType<typeof eq>>;
  const where = filters.length ? and(...filters) : undefined;
  const [rows, totals] = await Promise.all([
    db.select().from(approvalRequests).where(where).orderBy(sort === "oldest" ? asc(approvalRequests.createdAt) : sort === "priority" ? sql`FIELD(${approvalRequests.priority}, 'high', 'medium', 'low'), ${approvalRequests.createdAt} DESC` : desc(approvalRequests.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count() }).from(approvalRequests).where(where),
  ]);
  return { rows, total: Number(totals[0]?.total || 0) };
}

export async function getApprovalRequest(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(approvalRequests).where(eq(approvalRequests.id, id)).limit(1);
  return rows[0];
}

export async function createApprovalRequest(input: InsertApprovalRequest) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(approvalRequests).values(input);
  return getApprovalRequest(input.id);
}

export async function updateApprovalRequest(id: string, values: Partial<InsertApprovalRequest>) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(approvalRequests).set(values).where(eq(approvalRequests.id, id));
  return getApprovalRequest(id);
}

export async function listAuditEntries() {
  await ensureFleetSeeded();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditEntries).orderBy(desc(auditEntries.createdAt));
}

export async function addAuditEntry(input: InsertAuditEntry) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(auditEntries).values(input);
}

export async function getOperatorProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(operatorProfiles).where(eq(operatorProfiles.userId, userId)).limit(1);
  return rows[0];
}

export async function upsertOperatorProfile(input: InsertOperatorProfile) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(operatorProfiles).values(input).onDuplicateKeyUpdate({ set: { dashboardRole: input.dashboardRole, department: input.department, initials: input.initials } });
  return getOperatorProfile(input.userId);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function recordRoleChange(input: InsertAdminRoleChange) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.insert(adminRoleChanges).values(input).$returningId();
  return rows[0];
}

export async function listRoleChanges(input: { page?: number; pageSize?: number; query?: string; newRole?: string; from?: string; to?: string } = {}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const page = input.page || 1;
  const pageSize = input.pageSize || 20;
  const query = input.query?.trim();
  const filters = [
    query ? or(like(adminRoleChanges.targetName, `%${query}%`), like(adminRoleChanges.actorName, `%${query}%`), like(adminRoleChanges.newDepartment, `%${query}%`)) : undefined,
    input.newRole ? eq(adminRoleChanges.newRole, input.newRole) : undefined,
    input.from ? gte(adminRoleChanges.createdAt, new Date(`${input.from}T00:00:00.000Z`)) : undefined,
    input.to ? lte(adminRoleChanges.createdAt, new Date(`${input.to}T23:59:59.999Z`)) : undefined,
  ].filter(Boolean) as Array<ReturnType<typeof eq>>;
  const where = filters.length ? and(...filters) : undefined;
  const [rows, totals] = await Promise.all([
    db.select().from(adminRoleChanges).where(where).orderBy(desc(adminRoleChanges.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count() }).from(adminRoleChanges).where(where),
  ]);
  return { rows, total: Number(totals[0]?.total || 0) };
}

export async function createOperatorNotification(input: InsertOperatorNotification) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.insert(operatorNotifications).values(input).$returningId();
  const created = rows[0]?.id ? (await db.select().from(operatorNotifications).where(eq(operatorNotifications.id, rows[0].id)).limit(1))[0] : undefined;
  if (created) publishNotification(created);
  return created;
}

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  await db.insert(notificationPreferences).values({ userId });
  const created = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  return created[0];
}

export async function upsertNotificationPreferences(input: InsertNotificationPreferences) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(notificationPreferences).values(input).onDuplicateKeyUpdate({ set: { roleChanges: input.roleChanges, adminActions: input.adminActions, toastEnabled: input.toastEnabled } });
  return getNotificationPreferences(input.userId);
}

export async function getIpcPolicy(facilityId = "default-hospital") {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(ipcPolicies).where(eq(ipcPolicies.facilityId, facilityId)).limit(1);
  if (rows[0]) return rows[0];
  const seed: InsertIpcPolicy = { facilityId, facilityName: "Community General Hospital" };
  await db.insert(ipcPolicies).values(seed);
  const created = await db.select().from(ipcPolicies).where(eq(ipcPolicies.facilityId, facilityId)).limit(1);
  return created[0];
}

export async function upsertIpcPolicy(input: InsertIpcPolicy) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(ipcPolicies).values(input).onDuplicateKeyUpdate({ set: { facilityName: input.facilityName, handHygieneWatchPct: input.handHygieneWatchPct, handHygieneCriticalPct: input.handHygieneCriticalPct, evidenceStaleMinutes: input.evidenceStaleMinutes, ppeStaleHours: input.ppeStaleHours, urgentNotifications: input.urgentNotifications, watchNotifications: input.watchNotifications, lowResourceDefault: input.lowResourceDefault, updatedBy: input.updatedBy } });
  return getIpcPolicy(input.facilityId);
}

export async function listOperatorNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(operatorNotifications).where(eq(operatorNotifications.userId, userId)).orderBy(desc(operatorNotifications.createdAt)).limit(limit);
}

export async function markOperatorNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(operatorNotifications).set({ readAt: new Date() }).where(and(eq(operatorNotifications.userId, userId), sql`${operatorNotifications.readAt} IS NULL`));
}

export async function listOperatorProfiles() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ profile: operatorProfiles, user: { id: users.id, name: users.name, email: users.email, openId: users.openId } }).from(operatorProfiles).leftJoin(users, eq(operatorProfiles.userId, users.id)).orderBy(desc(operatorProfiles.updatedAt));
}

export async function seedTelemetry() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: fleetAgents.id }).from(fleetAgents).limit(1);
  if (existing.length) return;
  await db.insert(runtimeTelemetry).values({ id: "runtime-001", mode: "cloud", model: "gemini-3.5-flash", database: "Managed MySQL / Drizzle", guardrail: "Model Armor", pubsub: "OIDC push connected", trace: "Cloud Trace · OTel" });
  await db.insert(fleetAgents).values([
    { id: "payer-intelligence", name: "Payer Intelligence", domain: "Payer operations", version: "0.4.2", autonomy: "drafts_only", capabilities: ["Policy RAG", "Denial analysis", "Coverage verification"], restrictions: ["No direct dispatch", "Payer scope only", "Human approval required"], health: "healthy" },
    { id: "clinical-quality", name: "Clinical & Quality", domain: "Clinical operations", version: "0.3.8", autonomy: "drafts_only", capabilities: ["Guideline RAG", "Care-gap evaluation", "Quality initiatives"], restrictions: ["No patient outreach", "Clinical scope only", "Human approval required"], health: "healthy" },
    { id: "triage", name: "Triage Agent", domain: "Operations", version: "1.1.0", autonomy: "autonomous", capabilities: ["Ticket classification", "Owner assignment"], restrictions: ["No external messaging"], health: "healthy" },
    { id: "reconcile", name: "Reconcile Agent", domain: "Accounting", version: "1.0.6", autonomy: "read_only", capabilities: ["Ledger comparison", "Variance report"], restrictions: ["Read-only records", "Accounting scope only"], health: "standby" },
  ]);
  await db.insert(fleetEvents).values([
    { id: "evt-2048", kind: "denial.received", actor: "pubsub", routedTo: "Payer Intelligence", status: "completed", detail: "Synthetic denial CLM-9921 routed for policy analysis." },
    { id: "evt-2047", kind: "care_gap.detected", actor: "pubsub", routedTo: "Clinical & Quality", status: "completed", detail: "HEDIS-HbA1c cohort evaluation completed." },
    { id: "evt-2046", kind: "document.search", actor: "claims-specialist", routedTo: "Payer Intelligence", status: "blocked", detail: "Cross-domain contract-rate retrieval returned an empty permitted set." },
  ]);
}

export async function listTelemetry() {
  await seedTelemetry();
  const db = await getDb();
  if (!db) return { runtime: [], agents: [], events: [] };
  const [runtime, agents, events] = await Promise.all([
    db.select().from(runtimeTelemetry).orderBy(desc(runtimeTelemetry.capturedAt)).limit(1),
    db.select().from(fleetAgents).orderBy(fleetAgents.name),
    db.select().from(fleetEvents).orderBy(desc(fleetEvents.occurredAt)).limit(50),
  ]);
  return { runtime, agents, events };
}

export async function recordOperationalMetricSnapshot(input: {
  activeConnections: number;
  deliveryLatencyMs: number;
  maxDeliveryLatencyMs: number;
  deliveredNotifications: number;
  totalNotifications: number;
  droppedClients: number;
  bridgeReceived: number;
  bridgePublished: number;
  bridgeFailed: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const inserted = await db.insert(operationalMetricSnapshots).values(input).$returningId();
  return inserted[0]?.id;
}

export async function listOperationalMetricSnapshots(since: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(operationalMetricSnapshots).where(gte(operationalMetricSnapshots.capturedAt, since)).orderBy(asc(operationalMetricSnapshots.capturedAt));
}
