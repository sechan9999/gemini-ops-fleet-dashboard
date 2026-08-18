import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const operatorProfiles = mysqlTable("operatorProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  dashboardRole: mysqlEnum("dashboardRole", ["data_scientist", "medical_director", "payer_operations"]).notNull().default("data_scientist"),
  department: varchar("department", { length: 120 }),
  initials: varchar("initials", { length: 8 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const approvalRequests = mysqlTable("approvalRequests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  actionType: varchar("actionType", { length: 120 }).notNull(),
  state: mysqlEnum("state", ["pending", "approved", "rejected", "sent"]).notNull().default("pending"),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).notNull().default("medium"),
  agent: varchar("agent", { length: 160 }).notNull(),
  domain: varchar("domain", { length: 160 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  payload: json("payload").notNull(),
  evidence: json("evidence").notNull(),
  aiSummary: text("aiSummary"),
  approvedBy: varchar("approvedBy", { length: 160 }),
  rejectedBy: varchar("rejectedBy", { length: 160 }),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  stateCreatedAtIdx: index("approvalRequests_state_createdAt_idx").on(table.state, table.createdAt),
  priorityCreatedAtIdx: index("approvalRequests_priority_createdAt_idx").on(table.priority, table.createdAt),
  domainIdx: index("approvalRequests_domain_idx").on(table.domain),
}));

export const auditEntries = mysqlTable("auditEntries", {
  id: int("id").autoincrement().primaryKey(),
  approvalId: varchar("approvalId", { length: 64 }),
  actor: varchar("actor", { length: 160 }).notNull(),
  role: varchar("role", { length: 80 }).notNull(),
  tool: varchar("tool", { length: 120 }).notNull(),
  outcome: varchar("outcome", { length: 40 }).notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OperatorProfile = typeof operatorProfiles.$inferSelect;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type AuditEntry = typeof auditEntries.$inferSelect;
export type InsertOperatorProfile = typeof operatorProfiles.$inferInsert;
export type InsertApprovalRequest = typeof approvalRequests.$inferInsert;
export type InsertAuditEntry = typeof auditEntries.$inferInsert;

export const runtimeTelemetry = mysqlTable("runtimeTelemetry", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mode: varchar("mode", { length: 40 }).notNull(),
  model: varchar("model", { length: 120 }).notNull(),
  database: varchar("database", { length: 120 }).notNull(),
  guardrail: varchar("guardrail", { length: 120 }).notNull(),
  pubsub: varchar("pubsub", { length: 120 }).notNull(),
  trace: varchar("trace", { length: 120 }).notNull(),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
}, (table) => ({ capturedAtIdx: index("runtimeTelemetry_capturedAt_idx").on(table.capturedAt) }));

export const fleetAgents = mysqlTable("fleetAgents", {
  id: varchar("id", { length: 80 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  domain: varchar("domain", { length: 160 }).notNull(),
  version: varchar("version", { length: 40 }).notNull(),
  autonomy: varchar("autonomy", { length: 40 }).notNull(),
  capabilities: json("capabilities").notNull(),
  restrictions: json("restrictions").notNull(),
  health: varchar("health", { length: 40 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ domainIdx: index("fleetAgents_domain_idx").on(table.domain), healthIdx: index("fleetAgents_health_idx").on(table.health) }));

export const fleetEvents = mysqlTable("fleetEvents", {
  id: varchar("id", { length: 80 }).primaryKey(),
  kind: varchar("kind", { length: 120 }).notNull(),
  actor: varchar("actor", { length: 160 }).notNull(),
  routedTo: varchar("routedTo", { length: 160 }).notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  detail: text("detail").notNull(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => ({ occurredAtIdx: index("fleetEvents_occurredAt_idx").on(table.occurredAt), statusIdx: index("fleetEvents_status_idx").on(table.status) }));

export type RuntimeTelemetry = typeof runtimeTelemetry.$inferSelect;
export type FleetAgentRecord = typeof fleetAgents.$inferSelect;
export type FleetEventRecord = typeof fleetEvents.$inferSelect;
export type InsertRuntimeTelemetry = typeof runtimeTelemetry.$inferInsert;
export type InsertFleetAgent = typeof fleetAgents.$inferInsert;
export type InsertFleetEvent = typeof fleetEvents.$inferInsert;

export const adminRoleChanges = mysqlTable("adminRoleChanges", {
  id: int("id").autoincrement().primaryKey(),
  targetUserId: int("targetUserId").notNull(),
  actorUserId: int("actorUserId").notNull(),
  actorName: varchar("actorName", { length: 160 }).notNull(),
  targetName: varchar("targetName", { length: 160 }).notNull(),
  previousRole: varchar("previousRole", { length: 40 }).notNull(),
  newRole: varchar("newRole", { length: 40 }).notNull(),
  previousDepartment: varchar("previousDepartment", { length: 120 }),
  newDepartment: varchar("newDepartment", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  targetCreatedAtIdx: index("adminRoleChanges_target_createdAt_idx").on(table.targetUserId, table.createdAt),
  actorCreatedAtIdx: index("adminRoleChanges_actor_createdAt_idx").on(table.actorUserId, table.createdAt),
  createdAtIdx: index("adminRoleChanges_createdAt_idx").on(table.createdAt),
}));

export type AdminRoleChange = typeof adminRoleChanges.$inferSelect;
export type InsertAdminRoleChange = typeof adminRoleChanges.$inferInsert;

export const operatorNotifications = mysqlTable("operatorNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kind: varchar("kind", { length: 40 }).notNull().default("role_change"),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCreatedAtIdx: index("operatorNotifications_user_createdAt_idx").on(table.userId, table.createdAt),
  userReadAtIdx: index("operatorNotifications_user_readAt_idx").on(table.userId, table.readAt),
}));

export type OperatorNotification = typeof operatorNotifications.$inferSelect;
export type InsertOperatorNotification = typeof operatorNotifications.$inferInsert;

export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  roleChanges: boolean("roleChanges").notNull().default(true),
  adminActions: boolean("adminActions").notNull().default(true),
  toastEnabled: boolean("toastEnabled").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferences.$inferInsert;

export const operationalMetricSnapshots = mysqlTable("operationalMetricSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
  activeConnections: int("activeConnections").notNull().default(0),
  deliveryLatencyMs: int("deliveryLatencyMs").notNull().default(0),
  maxDeliveryLatencyMs: int("maxDeliveryLatencyMs").notNull().default(0),
  deliveredNotifications: int("deliveredNotifications").notNull().default(0),
  totalNotifications: int("totalNotifications").notNull().default(0),
  droppedClients: int("droppedClients").notNull().default(0),
  bridgeReceived: int("bridgeReceived").notNull().default(0),
  bridgePublished: int("bridgePublished").notNull().default(0),
  bridgeFailed: int("bridgeFailed").notNull().default(0),
}, (table) => ({
  capturedAtIdx: index("operationalMetricSnapshots_capturedAt_idx").on(table.capturedAt),
}));

export type OperationalMetricSnapshot = typeof operationalMetricSnapshots.$inferSelect;
export type InsertOperationalMetricSnapshot = typeof operationalMetricSnapshots.$inferInsert;
