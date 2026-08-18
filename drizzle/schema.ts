import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
});

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