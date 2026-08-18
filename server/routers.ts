import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { addAuditEntry, ensureFleetSeeded, getApprovalRequest, getOperatorProfile, listApprovalRequests, listAuditEntries, updateApprovalRequest, upsertOperatorProfile } from "./db";

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
    id: row.id,
    actionType: row.actionType,
    state: row.state,
    priority: row.priority,
    agent: row.agent,
    domain: row.domain,
    subject: row.subject,
    summary: row.summary,
    payload: row.payload as Record<string, string>,
    evidence: row.evidence as string[],
    aiSummary: row.aiSummary || undefined,
    approvedBy: row.approvedBy || undefined,
    rejectedBy: row.rejectedBy || undefined,
    rejectionReason: row.rejectionReason || undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  fleet: router({
    profile: protectedProcedure.query(async ({ ctx }) => {
      const profile = await profileFor(ctx.user);
      return {
        employeeId: ctx.user.id,
        name: ctx.user.name || "Operator",
        role: profile?.dashboardRole || "data_scientist",
        roleLabel: ({ data_scientist: "Data Scientist", medical_director: "Medical Director", payer_operations: "Payer Operations" } as const)[profile?.dashboardRole || "data_scientist"],
        department: profile?.department || "Clinical analytics",
        initials: profile?.initials || initials(ctx.user.name || "Operator"),
        source: "database" as const,
      };
    }),
    snapshot: protectedProcedure.query(async () => {
      await ensureFleetSeeded();
      const [approvals, audit] = await Promise.all([listApprovalRequests(), listAuditEntries()]);
      return {
        approvals: approvals.map(normalizedApproval),
        audit: audit.map((entry) => ({ id: String(entry.id), actor: entry.actor, role: entry.role, tool: entry.tool, outcome: entry.outcome as "allowed" | "denied" | "blocked" | "approved" | "rejected" | "sent", detail: entry.detail, timestamp: entry.createdAt.toISOString() })),
      };
    }),
    transition: protectedProcedure.input(actionInput).mutation(async ({ ctx, input }) => {
      const profile = await profileFor(ctx.user);
      const approval = await getApprovalRequest(input.id);
      if (!approval) throw new Error("Approval request not found");
      const canApprove = profile?.dashboardRole === "medical_director" || profile?.dashboardRole === "payer_operations";
      if ((input.action === "approve" || input.action === "reject") && !canApprove) throw new Error("This role cannot change approval state");
      if (input.action === "send" && !canApprove) throw new Error("This role cannot send approval actions");
      if (input.action === "reject" && !input.reason?.trim()) throw new Error("A rejection reason is required");
      if (input.action === "send" && approval.state !== "approved") throw new Error("409: only approved requests can be sent");
      if (profile?.dashboardRole === "payer_operations" && approval.domain !== "Payer operations") throw new Error("This role is scoped to payer operations");
      const nextState = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "sent";
      const updated = await updateApprovalRequest(input.id, { state: nextState, approvedBy: input.action === "approve" ? ctx.user.name || "Operator" : approval.approvedBy, rejectedBy: input.action === "reject" ? ctx.user.name || "Operator" : approval.rejectedBy, rejectionReason: input.action === "reject" ? input.reason?.trim() : approval.rejectionReason });
      await addAuditEntry({ approvalId: input.id, actor: ctx.user.name || "Operator", role: profile?.dashboardRole || "data_scientist", tool: input.action, outcome: input.action === "send" ? "sent" : input.action === "approve" ? "approved" : "rejected", detail: input.action === "reject" ? `Request rejected. Reason: ${input.reason?.trim()}` : input.action === "approve" ? "Human approval recorded." : "Approved request dispatched." });
      return updated ? normalizedApproval(updated) : null;
    }),
    summarize: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      const approval = await getApprovalRequest(input.id);
      if (!approval) throw new Error("Approval request not found");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You summarize synthetic or explicitly permitted clinical workflow data for a human approval queue. Return one concise paragraph of 40 words or fewer. Explain the observed signal, operational implication, and uncertainty. Do not diagnose, recommend treatment, invent facts, or make the approval decision." },
          { role: "user", content: `Request: ${approval.summary}\nSubject: ${approval.subject}\nEvidence: ${JSON.stringify(approval.evidence)}\nServer-authorized clinical payload: ${JSON.stringify(approval.payload)}` },
        ],
      });
      const content = response.choices?.[0]?.message?.content;
      const summary = typeof content === "string" ? content.trim() : `The request concerns ${approval.subject} and requires human review of the supplied evidence before any operational action.`;
      const updated = await updateApprovalRequest(input.id, { aiSummary: summary });
      return updated ? normalizedApproval(updated) : null;
    }),
    saveSummary: protectedProcedure.input(z.object({ id: z.string(), summary: z.string().min(1) })).mutation(async ({ input }) => {
      const updated = await updateApprovalRequest(input.id, { aiSummary: input.summary });
      return updated ? normalizedApproval(updated) : null;
    }),
  }),
});

export type AppRouter = typeof appRouter;
