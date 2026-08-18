import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { approvalRequests, auditEntries, InsertApprovalRequest, InsertAuditEntry, InsertOperatorProfile, InsertUser, operatorProfiles, users } from "../drizzle/schema";
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

export async function ensureFleetSeeded() {
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
