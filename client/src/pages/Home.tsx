// Clinical Command Ledger design: warm paper surfaces, visible governance states, and evidence-led healthcare operations.
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import NotificationInbox from "@/components/NotificationInbox";
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipTrigger as UiTooltipTrigger } from "@/components/ui/tooltip";
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  ArrowUpRight,
  Bell,
  Bookmark,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CircleDot,
  Clock3,
  Database,
  Download,
  FileCheck2,
  Filter,
  HeartPulse,
  Inbox,
  LockKeyhole,
  Loader2,
  Menu,
  MessageSquare,
  Play,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Save,
  Trash2,
  Sparkles,
  Terminal,
  X,
  XCircle,
  Zap,
  UserCog,
  Gauge,
  TrendingUp,
  ClipboardCheck,
  Droplets,
  ShieldAlert,
  Siren,
  UsersRound,
  WifiOff,
} from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Approval,
  ApprovalState,
  AuditEntry,
  FleetAgent,
  FleetEvent,
  FleetSnapshot,
  OperatorProfile,
  DashboardRole,
  approveDraft,
  drainEvents,
  generateApprovalSummary,
  rejectDraft,
  loadFleetSnapshot,
  loadOperatorProfile,
  sendDraft,
  demoProfile,
  demoSnapshot,
} from "@/lib/fleet-api";

const tabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "registry", label: "Agent registry", icon: Bot },
  { id: "events", label: "Event stream", icon: Radio },
  { id: "approvals", label: "Approval queue", icon: FileCheck2 },
  { id: "audit", label: "Audit & trace", icon: ShieldCheck },
  { id: "infection", label: "IPC command", icon: ShieldAlert },
  { id: "admin", label: "Operator admin", icon: UserCog },
] as const;

type TabId = (typeof tabs)[number]["id"];

type RolePermissions = {
  allowedTabs: TabId[];
  canApprove: boolean;
  canSend: boolean;
  approvalDomains: string[];
  summary: string;
};

const rolePermissions: Record<DashboardRole, RolePermissions> = {
  data_scientist: {
    allowedTabs: ["overview", "registry", "events", "audit", "infection"],
    canApprove: false,
    canSend: false,
    approvalDomains: [],
    summary: "Analytics view · approvals remain with accountable operators",
  },
  medical_director: {
    allowedTabs: ["overview", "registry", "events", "approvals", "audit", "infection"],
    canApprove: true,
    canSend: true,
    approvalDomains: ["Payer operations", "Clinical operations"],
    summary: "Full clinical governance view · approval authority enabled",
  },
  payer_operations: {
    allowedTabs: ["overview", "registry", "events", "approvals", "audit", "infection"],
    canApprove: true,
    canSend: true,
    approvalDomains: ["Payer operations"],
    summary: "Payer operations view · payer actions only",
  },
};

const scopeSnapshot = (snapshot: FleetSnapshot, profile: OperatorProfile): FleetSnapshot => {
  const permissions = rolePermissions[profile.role];
  const approvals = snapshot.approvals.filter((approval) => permissions.approvalDomains.includes(approval.domain));
  const audit = profile.role === "medical_director"
    ? snapshot.audit
    : profile.role === "payer_operations"
      ? snapshot.audit.filter((entry) => entry.detail.toLowerCase().includes("payer") || entry.tool.includes("prior") || entry.tool.includes("approval") || entry.outcome === "blocked" || entry.outcome === "denied")
      : snapshot.audit.filter((entry) => entry.actor === profile.name || entry.outcome === "blocked" || entry.outcome === "denied");
  return { ...snapshot, approvals, audit };
};

const formatTime = (value: string) => new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const formatDate = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function StatusDot({ status }: { status: "teal" | "amber" | "coral" | "slate" }) {
  const color = { teal: "bg-teal", amber: "bg-amber", coral: "bg-coral", slate: "bg-slate-300" }[status];
  return <span className={`inline-block size-2 rounded-full ${color}`} aria-hidden="true" />;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

function StatePill({ state }: { state: ApprovalState }) {
  const config = {
    pending: { label: "Pending review", className: "pill-amber", icon: Clock3 },
    approved: { label: "Approved", className: "pill-teal", icon: CheckCircle2 },
    sent: { label: "Sent", className: "pill-ink", icon: Send },
    rejected: { label: "Rejected", className: "pill-coral", icon: XCircle },
  }[state];
  const Icon = config.icon;
  return <span className={`state-pill ${config.className}`}><Icon size={13} />{config.label}</span>;
}

function AutonomyPill({ autonomy }: { autonomy: FleetAgent["autonomy"] }) {
  const config = {
    autonomous: { label: "Autonomous", className: "pill-teal" },
    drafts_only: { label: "Drafts only", className: "pill-amber" },
    read_only: { label: "Read only", className: "pill-ink" },
  }[autonomy];
  return <span className={`state-pill ${config.className}`}>{config.label}</span>;
}

function Metric({ label, value, note, tone = "teal", icon: Icon }: { label: string; value: string | number; note: string; tone?: "teal" | "amber" | "coral" | "ink"; icon: typeof Activity }) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="flex items-start justify-between gap-4"><Eyebrow>{label}</Eyebrow><Icon size={17} strokeWidth={1.8} /></div>
      <p className="metric-value">{value}</p>
      <p className="metric-note">{note}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="section-heading mb-5 flex min-w-0 items-end justify-between gap-4"><div className="section-heading-copy min-w-0"><Eyebrow>{eyebrow}</Eyebrow><h2 className="section-title">{title}</h2>{description && <p className="section-description">{description}</p>}</div>{action && <div className="section-heading-action min-w-0">{action}</div>}</div>;
}

function Overview({ snapshot, canReviewApprovals, onNavigate }: { snapshot: FleetSnapshot; canReviewApprovals: boolean; onNavigate: (tab: TabId) => void }) {
  const pending = snapshot.approvals.filter((a) => a.state === "pending").length;
  const blocked = snapshot.audit.filter((a) => a.outcome === "blocked" || a.outcome === "denied").length;
  const completed = snapshot.events.filter((e) => e.status === "completed").length;
  return <>
    <div className="hero-panel">
      <div className="hero-copy"><div className="flex items-center gap-2 text-teal"><span className="live-pulse" /> <span className="eyebrow text-teal">Fleet live · synthetic environment</span></div><h1>Automation with a visible boundary.</h1><p>Gemini agents are handling the operational work. The decision surface stays with the people accountable for it.</p><div className="hero-evidence"><span><Radio size={13} /> ASYNC ROUTING</span><span><Database size={13} /> SQL SCOPE</span><span><FileCheck2 size={13} /> HUMAN GATE</span></div><button className="primary-button" onClick={() => onNavigate(canReviewApprovals ? "approvals" : "events")}>{canReviewApprovals ? "Review human gate" : "Inspect event stream"} <ArrowUpRight size={16} /></button></div>
      <div className="hero-graphic"><div className="hero-graphic-art" role="img" aria-label="Abstract event stream crossing governance checkpoints" /><div className="hero-graphic-label"><span className="eyebrow">LATEST CONTROLLED FLOW</span><strong>denial.received → payer intelligence</strong></div></div>
    </div>
    <div className="metrics-grid"><Metric label="Agents online" value={`${snapshot.agents.length}/4`} note="All registered scopes healthy" icon={Bot} /><Metric label="Events completed" value={completed} note="Across the shared event spine" icon={Zap} /><Metric label="Needs approval" value={pending} note="Nothing dispatches by itself" tone="amber" icon={Clock3} /><Metric label="Protected calls" value={blocked} note="Denied or blocked before model" tone="coral" icon={LockKeyhole} /></div>
    <div className="overview-grid">
      <div className="ledger-card"><SectionHeading eyebrow="ASYNC EVENT" title="Latest activity" description="The fleet works from events, not prompts." action={<button className="text-button" onClick={() => onNavigate("events")}>View stream <ChevronRight size={15} /></button>} /><div className="activity-list">{snapshot.events.slice(0, 4).map((event) => <EventRow key={event.id} event={event} />)}</div></div>
      <div className="ledger-card boundary-card"><SectionHeading eyebrow="CONTROL MARGIN" title="What the fleet cannot do" description="These restrictions are enforced outside the model." /><div className="boundary-list"><Boundary icon={LockKeyhole} title="Identity is server-derived" copy="No tool accepts a role or employee ID argument." /><Boundary icon={Database} title="Retrieval is filtered first" copy="SQL scope runs before ranking or synthesis." /><Boundary icon={FileCheck2} title="Outbound actions need a human" copy="Drafts queue; send returns 409 without sign-off." /></div><button className="quiet-button w-full" onClick={() => onNavigate("audit")}>Inspect refusal telemetry <ArrowUpRight size={15} /></button></div>
    </div>
  </>;
}

type IpcSignal = { ward: string; signal: string; level: "watch" | "urgent" | "stable"; freshness: string; owner: string; evidence: string; action: string; resource: string };

const ipcSignals: IpcSignal[] = [
  { ward: "Ward 2 · Medical", signal: "Hand-hygiene observation gap", level: "urgent", freshness: "18 min ago", owner: "Nurse manager", evidence: "7 of 24 observations logged this shift", action: "Verify observation coverage before next handoff", resource: "One trained observer" },
  { ward: "Ward 1 · Surgical", signal: "PPE cart readiness", level: "watch", freshness: "42 min ago", owner: "IPC lead", evidence: "N95 stock count is stale; last check was yesterday", action: "Reconcile cart count and document exception", resource: "Inventory check · 10 min" },
  { ward: "Ward 3 · Rehab", signal: "Environmental cleaning feedback", level: "stable", freshness: "1 hr ago", owner: "Environmental services", evidence: "12 of 12 high-touch checks recorded", action: "Continue current audit cadence", resource: "No additional staffing" },
];

const ipcTasks = [
  { id: "ipc-precaution-review", label: "Transmission-based precaution review", count: 2, tone: "urgent" as const, priority: "high" as const, status: "open" as const, kind: "precaution" as const, icon: Siren, reason: "coverage_gap" as const, commentHistory: [] as IpcTaskComment[] },
  { id: "ipc-surface-verification", label: "High-touch surface verification", count: 4, tone: "watch" as const, priority: "medium" as const, status: "open" as const, kind: "cleaning" as const, icon: Droplets, reason: "environmental_cleaning" as const, commentHistory: [] as IpcTaskComment[] },
  { id: "ipc-refresher-training", label: "Frontline refresher training", count: 1, tone: "stable" as const, priority: "low" as const, status: "open" as const, kind: "training" as const, icon: UsersRound, reason: "training_gap" as const, commentHistory: [] as IpcTaskComment[] },
];

type IpcTaskReason = "coverage_gap" | "ppe_readiness" | "environmental_cleaning" | "training_gap";
type IpcTaskPriority = "high" | "medium" | "low";
type IpcTaskStatus = "open" | "in_progress" | "completed";
type IpcCommentCategory = "verification" | "resource" | "training" | "coverage" | "other";
type IpcQueuePreset = { id: string; name: string; search: string; reasonFilter: "all" | IpcTaskReason; statusFilter: "all" | IpcTaskStatus; commentFilter?: "all" | "with_comments"; aiCategoryFilter?: "all" | IpcCommentCategory; prioritySort: "none" | "high_to_low" | "low_to_high" };
const IPC_PRIORITY_LABELS: Record<IpcTaskPriority, string> = { high: "High", medium: "Medium", low: "Low" };
const IPC_PRIORITY_RANK: Record<IpcTaskPriority, number> = { high: 3, medium: 2, low: 1 };
const IPC_PRESETS_STORAGE_KEY = "gemini-ops-ipc-queue-presets";
const IPC_QA_HISTORY_STORAGE_KEY = "gemini-ops-ipc-qa-history";
type IpcQuestionHistory = { id: string; question: string; answer: string; range: "daily" | "weekly"; askedAt: string };
type IpcCommentAssignment = { taskId: string; category: IpcCommentCategory; createdAt: string };
type IpcCommentTrendPoint = { dateKey: string } & Record<IpcCommentCategory, number>;
type IpcTrendPoint = { dateKey: string; label: string; openTasks: number; urgentTasks: number; watchTasks: number; stableTasks: number; completedTasks: number; escalations: number; dismissals: number };
type IpcTaskComment = { id: string; comment: string; actor: string; role: string; createdAt: string };
type InfectionControlData = { signals: IpcSignal[]; tasks: Array<{ id: string; label: string; count: number; tone: "urgent" | "watch" | "stable"; priority: IpcTaskPriority; status: IpcTaskStatus; kind: "precaution" | "cleaning" | "training"; reason: IpcTaskReason; lastComment?: string | null; commentHistory?: IpcTaskComment[] }>; safety: { syntheticOnly: boolean; autonomousDeclarations: boolean; humanApprovalRequired: boolean }; trends: { source: "synthetic_facility"; daily: IpcTrendPoint[]; weekly: IpcTrendPoint[] } };
const IPC_REASON_LABELS: Record<IpcTaskReason, string> = { coverage_gap: "Coverage gap", ppe_readiness: "PPE readiness", environmental_cleaning: "Environmental cleaning", training_gap: "Training gap" };
const IPC_CATEGORY_LABELS: Record<IpcCommentCategory, string> = { verification: "Verification", resource: "Resource", training: "Training", coverage: "Coverage", other: "Other" };
const IPC_CATEGORY_COLORS: Record<IpcCommentCategory, string> = { verification: "#087f73", resource: "#b7791f", training: "#64748b", coverage: "#c6534b", other: "#8b5cf6" };

function IpcTrendPanel({ fallbackTrends, tasks, onCommentAssignments }: { fallbackTrends?: InfectionControlData["trends"]; tasks: InfectionControlData["tasks"]; onCommentAssignments?: (assignments: IpcCommentAssignment[]) => void }) {
  const [range, setRange] = useState<"daily" | "weekly">("daily");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const availableTrends = fallbackTrends;
  const boundsSeries = availableTrends?.[range] || [];
  const trendQuery = trpc.fleet.infectionControlTrends.useQuery({ from: dateFrom || undefined, to: dateTo || undefined });
  const trendSummary = trpc.fleet.infectionControlTrendSummary.useMutation();
  const trendQuestion = trpc.fleet.infectionControlTrendQuestion.useMutation();
  const commentSummary = trpc.fleet.infectionControlCommentSummary.useMutation();
  const [question, setQuestion] = useState("");
  const categoryTrend = (commentSummary.data?.trend || []) as IpcCommentTrendPoint[];
  const [questionHistory, setQuestionHistory] = useState<IpcQuestionHistory[]>(() => { try { return JSON.parse(localStorage.getItem(IPC_QA_HISTORY_STORAGE_KEY) || "[]") as IpcQuestionHistory[]; } catch { return []; } });
  const trends = trendQuery.data || fallbackTrends;
  const series = trends?.[range] || [];

  useEffect(() => {
    if (boundsSeries.length && !dateFrom && !dateTo) {
      setDateFrom(boundsSeries[0].dateKey);
      setDateTo(boundsSeries[boundsSeries.length - 1].dateKey);
    }
  }, [boundsSeries, dateFrom, dateTo]);

  const points = useMemo(
    () => series.filter((point) => (!dateFrom || point.dateKey >= dateFrom) && (!dateTo || point.dateKey <= dateTo)),
    [series, dateFrom, dateTo],
  );

  const selectRange = (nextRange: "daily" | "weekly") => {
    const nextSeries = availableTrends?.[nextRange] || [];
    setRange(nextRange);
    if (nextSeries.length) {
      setDateFrom(nextSeries[0].dateKey);
      setDateTo(nextSeries[nextSeries.length - 1].dateKey);
    }
  };

  const resetDates = () => {
    if (boundsSeries.length) {
      setDateFrom(boundsSeries[0].dateKey);
      setDateTo(boundsSeries[boundsSeries.length - 1].dateKey);
    }
  };

  const summaryInput = useMemo(() => ({ range, points: points.map((point) => ({ label: point.label, openTasks: point.openTasks, completedTasks: point.completedTasks, escalations: point.escalations, dismissals: point.dismissals })), tasks: tasks.map((task) => ({ id: task.id, priority: task.priority, status: task.status, count: task.count })) }), [range, points, tasks]);
  const commentSummaryInput = useMemo(() => ({ range, comments: tasks.flatMap((task) => (task.commentHistory || []).map((entry) => ({ taskId: task.id, comment: entry.comment, actor: entry.actor, role: entry.role, createdAt: entry.createdAt }))) }), [range, tasks]);
  const generateSummary = () => { trendSummary.mutate(summaryInput); };
  const askQuestion = () => { const trimmed = question.trim(); if (!trimmed || !summaryInput.points.length) return; trendQuestion.mutate({ question: trimmed, ...summaryInput }, { onSuccess: (result) => { const next = [{ id: crypto.randomUUID(), question: trimmed, answer: result.answer, range, askedAt: result.askedAt }, ...questionHistory].slice(0, 12); setQuestionHistory(next); localStorage.setItem(IPC_QA_HISTORY_STORAGE_KEY, JSON.stringify(next)); setQuestion(""); toast.success("Trend question answered", { description: "The response is limited to the supplied synthetic queue context." }); }, onError: (error) => toast.error("Trend question failed", { description: error.message }) }); };
  const copyHistoryItem = async (item: IpcQuestionHistory) => { try { await navigator.clipboard.writeText(`Question: ${item.question}\nAnswer: ${item.answer}`); toast.success("Q&A copied", { description: "The question and answer are ready to paste into a report." }); } catch { toast.error("Copy unavailable", { description: "Select the text manually from the history panel." }); } };
  useEffect(() => { if (summaryInput.points.length) trendSummary.mutate(summaryInput); }, [summaryInput]);
  useEffect(() => { commentSummary.mutate(commentSummaryInput); }, [commentSummaryInput]);
  useEffect(() => { const assignments = (commentSummary.data?.assignments || []) as IpcCommentAssignment[]; onCommentAssignments?.(assignments); }, [commentSummary.data, onCommentAssignments]);

  const exportChart = async (format: "png" | "pdf") => {
    if (!panelRef.current || !points.length) {
      toast.error("No chart data to export", { description: "Choose a date range containing trend samples." });
      return;
    }
    try {
      const dataUrl = await toPng(panelRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#fbfaf6" });
      const filename = `gemini-ops-ipc-trends-${range}-${dateFrom || "start"}-${dateTo || "end"}`;
      if (format === "png") {
        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        const bounds = panelRef.current.getBoundingClientRect();
        const pdf = new jsPDF({ orientation: bounds.width >= bounds.height ? "landscape" : "portrait", unit: "px", format: [bounds.width, bounds.height] });
        pdf.addImage(dataUrl, "PNG", 0, 0, bounds.width, bounds.height);
        pdf.save(`${filename}.pdf`);
      }
      toast.success(`${format.toUpperCase()} chart exported`, { description: `${points.length} ${range} trend samples included.` });
    } catch (error) {
      toast.error("Chart export failed", { description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const controls = (
    <div className="ipc-trend-controls flex min-w-0 flex-wrap items-end gap-2 border-b border-line bg-paper/50 p-4">
      <label className="date-control"><span>From</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label className="date-control"><span>To</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
      <button className="quiet-button compact" onClick={resetDates}>Reset range</button>
      <div className="ipc-trend-export-actions ml-auto flex min-w-0 flex-wrap gap-2">
        <button className="quiet-button compact" onClick={() => void exportChart("png")} disabled={!points.length}><Download size={14} /> PNG</button>
        <button className="quiet-button compact" onClick={() => void exportChart("pdf")} disabled={!points.length}><Download size={14} /> PDF</button>
      </div>
      {dateFrom && dateTo && dateFrom > dateTo && <p className="basis-full text-xs text-coral">The start date must be on or before the end date.</p>}
    </div>
  );

  return (
    <div ref={panelRef} className="ledger-card mt-5 overflow-hidden">
      <div className="ipc-trend-header flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div className="ipc-trend-header-copy min-w-0"><Eyebrow>IPC OPERATIONS / {range.toUpperCase()}</Eyebrow><h2 className="admin-card-title">Task queue trends</h2><p className="mt-1 text-sm text-slate-500">Synthetic facility workload history keeps open tasks, completions, and human decisions visible.</p></div>
        <div className="ipc-trend-header-actions flex min-w-0 flex-wrap items-center justify-end gap-2"><span className="state-pill pill-amber">Synthetic trend</span><div className="flex rounded-lg border border-line bg-paper p-1"><button className={`trend-toggle ${range === "daily" ? "active" : ""}`} onClick={() => selectRange("daily")}>Daily</button><button className={`trend-toggle ${range === "weekly" ? "active" : ""}`} onClick={() => selectRange("weekly")}>Weekly</button></div></div>
      </div>
      {controls}
      <div className="ipc-summary-widget">
        <div className="flex items-start gap-3"><div className="summary-icon"><Sparkles size={16} /></div><div className="min-w-0 flex-1"><Eyebrow>GEMINI TREND BRIEF</Eyebrow><p className="ipc-summary-copy mt-1 text-sm leading-6 text-slate-600">{trendSummary.isPending ? "Generating a governed operational brief…" : trendSummary.data?.summary || "Generate a concise, governed readout of the active queue trend and human decisions."}</p><p className="mt-2 text-[10px] text-slate-400">AI output is an operational summary only; synthetic signals still require local IPC review.</p>{commentSummary.isPending ? <div className="ipc-comment-ai-state"><Loader2 size={13} className="spin" /> Categorizing explanatory comments…</div> : <div className="ipc-comment-ai-summary"><div className="flex items-center gap-2"><MessageSquare size={13} className="text-teal" /><span className="eyebrow">COMMENT SIGNALS</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{commentSummary.data?.summary || "No explanatory comment summary is available for this queue context."}</p>{Boolean(commentSummary.data?.categories?.length) && <div className="mt-2 flex flex-wrap gap-1.5">{commentSummary.data?.categories?.map((category) => <span className="tag" key={`${category.name}-${category.count}`}>{category.name} · {category.count}</span>)}</div>}</div>}</div><button className="quiet-button compact shrink-0" onClick={generateSummary} disabled={trendSummary.isPending || !points.length}>{trendSummary.isPending ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} {trendSummary.isPending ? "Summarizing" : "Generate brief"}</button></div>
        <div className="ipc-question-box"><div className="flex items-center gap-2"><MessageSquare size={15} className="text-teal" /><Eyebrow>ASK ABOUT THIS TREND</Eyebrow></div><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input className="text-input flex-1" value={question} maxLength={500} placeholder="e.g. Which day had the highest open-task load?" onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") askQuestion(); }} /><button className="quiet-button compact" onClick={askQuestion} disabled={trendQuestion.isPending || !question.trim() || !points.length}>{trendQuestion.isPending ? <Loader2 size={14} className="spin" /> : <Send size={14} />} {trendQuestion.isPending ? "Answering" : "Ask"}</button></div>{trendQuestion.data?.answer && <div className="ipc-question-answer"><span className="eyebrow">ANSWER</span><p>{trendQuestion.data.answer}</p></div>}{questionHistory.length > 0 && <details className="ipc-history-panel"><summary><span><Clock3 size={13} /> Previous questions and answers</span><span>{questionHistory.length}</span></summary><div className="space-y-2">{questionHistory.map((item) => <div className="ipc-history-item" key={item.id}><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-ink">{item.question}</p><button className="icon-button small" onClick={() => void copyHistoryItem(item)} aria-label="Copy question and answer"><Copy size={13} /></button></div><p className="mt-1 text-xs leading-5 text-slate-600">{item.answer}</p><p className="mt-1 text-[10px] text-slate-400">{item.range} · {new Date(item.askedAt).toLocaleString()}</p></div>)}</div></details>}</div>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        {trendQuery.isLoading ? <><IpcChartSkeleton label="Loading queue load trend" /><IpcChartSkeleton label="Loading human decision trend" /><IpcChartSkeleton label="Loading AI comment category trend" /></> : <>
          <div className="min-w-0"><div className="mb-3 flex items-center justify-between"><div><Eyebrow>QUEUE LOAD</Eyebrow><p className="text-sm font-semibold text-ink">Open vs completed tasks</p></div><ClipboardCheck size={17} className="text-teal" /></div><div className="h-56 w-full">{points.length ? <ResponsiveContainer width="100%" height="100%" minWidth={250}><LineChart data={points}><CartesianGrid stroke="#e7e5dc" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} width={30} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9d8cf", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="openTasks" name="Open" stroke="#c6534b" strokeWidth={2.5} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="completedTasks" name="Completed" stroke="#087f73" strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No trend samples in this range.</div>}</div></div>
          <div className="min-w-0"><div className="mb-3 flex items-center justify-between"><div><Eyebrow>HUMAN DECISIONS</Eyebrow><p className="text-sm font-semibold text-ink">Escalations vs dismissals</p></div><ShieldCheck size={17} className="text-amber-700" /></div><div className="h-56 w-full">{points.length ? <ResponsiveContainer width="100%" height="100%" minWidth={250}><LineChart data={points}><CartesianGrid stroke="#e7e5dc" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} width={30} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9d8cf", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="escalations" name="Escalated" stroke="#b7791f" strokeWidth={2.5} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="dismissals" name="Dismissed" stroke="#64748b" strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No trend samples in this range.</div>}</div></div>
          <div className="min-w-0 lg:col-span-2"><div className="mb-3 flex items-center justify-between"><div><Eyebrow>AI COMMENT CATEGORIES</Eyebrow><p className="text-sm font-semibold text-ink">Explanatory comment types over time</p></div><MessageSquare size={17} className="text-teal" /></div><div className="h-56 w-full">{categoryTrend.length ? <ResponsiveContainer width="100%" height="100%" minWidth={250}><LineChart data={categoryTrend}><CartesianGrid stroke="#e7e5dc" strokeDasharray="3 3" /><XAxis dataKey="dateKey" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} width={30} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9d8cf", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} />{(Object.keys(IPC_CATEGORY_LABELS) as IpcCommentCategory[]).map((category) => <Line key={category} type="monotone" dataKey={category} name={IPC_CATEGORY_LABELS[category]} stroke={IPC_CATEGORY_COLORS[category]} strokeWidth={2.25} dot={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No categorized explanatory comments in this range.</div>}</div></div>
        </>}
      </div>
    </div>
  );
}

function IpcChartSkeleton({ label }: { label: string }) { return <div className="min-w-0" aria-label={label}><div className="mb-3 flex items-center justify-between"><div className="skeleton-line wide" /><div className="skeleton-dot" /></div><div className="chart-skeleton"><div className="skeleton-chart-line one" /><div className="skeleton-chart-line two" /><div className="skeleton-chart-line three" /></div></div>; }

function InfectionControl({ onNavigate, data, canReview, audit, onTransition }: { onNavigate: (tab: TabId) => void; data?: InfectionControlData; canReview: boolean; audit: AuditEntry[]; onTransition: (signal: string, action: "verify" | "escalate" | "dismiss", reason?: string) => Promise<void> }) {
  const [lowResource, setLowResource] = useState(false);
  const [selected, setSelected] = useState<IpcSignal | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [reasonFilter, setReasonFilter] = useState<"all" | IpcTaskReason>("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [prioritySort, setPrioritySort] = useState<"none" | "high_to_low" | "low_to_high">("high_to_low");
  const [statusFilter, setStatusFilter] = useState<"all" | IpcTaskStatus>("all");
  const [commentFilter, setCommentFilter] = useState<"all" | "with_comments">("all");
  const [aiCategoryFilter, setAiCategoryFilter] = useState<"all" | IpcCommentCategory>("all");
  const [commentAssignments, setCommentAssignments] = useState<IpcCommentAssignment[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkPriority, setBulkPriority] = useState<"" | IpcTaskPriority>("");
  const [bulkStatus, setBulkStatus] = useState<"" | IpcTaskStatus>("");
  const [bulkComment, setBulkComment] = useState("");
  const [bulkCompleted, setBulkCompleted] = useState(false);
  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [inlineComments, setInlineComments] = useState<Record<string, string>>({});
  const [taskOverrides, setTaskOverrides] = useState<Record<string, Partial<{ priority: IpcTaskPriority; status: IpcTaskStatus; lastComment: string | null }>>>({});
  const [exporting, setExporting] = useState<"queue" | "selected" | "audit" | null>(null);
  const taskBulkUpdate = trpc.fleet.infectionControlTaskBulkUpdate.useMutation();
  const trpcUtils = trpc.useUtils();
  const [presets, setPresets] = useState<IpcQueuePreset[]>(() => { try { return JSON.parse(localStorage.getItem(IPC_PRESETS_STORAGE_KEY) || "[]") as IpcQueuePreset[]; } catch { return []; } });
  useEffect(() => { setDecisionReason(""); }, [selected?.signal]);
  const signals = data?.signals || ipcSignals;
  const tasks = useMemo(() => (data?.tasks || ipcTasks).map((task) => ({ ...task, ...taskOverrides[task.id] })), [data?.tasks, taskOverrides]);
  const applyTaskUpdate = (taskIds: string[], patch: { priority?: IpcTaskPriority; status?: IpcTaskStatus }, comment?: string) => { if (!taskIds.length || (!patch.priority && !patch.status)) return; setBulkCompleted(false); taskBulkUpdate.mutate({ taskIds, ...patch, ...(comment?.trim() ? { comment: comment.trim() } : {}) }, { onSuccess: async () => { const commentPatch = comment?.trim() ? { lastComment: comment.trim() } : {}; setTaskOverrides((current) => Object.fromEntries(Object.entries({ ...current, ...Object.fromEntries(taskIds.map((id) => [id, { ...current[id], ...patch, ...commentPatch }])) }))); await trpcUtils.fleet.infectionControl.invalidate(); setSelectedTaskIds([]); setBulkPriority(""); setBulkStatus(""); setBulkComment(""); setInlineComments((current) => { const next = { ...current }; taskIds.forEach((id) => delete next[id]); return next; }); setCommentTaskId(null); setBulkCompleted(true); window.setTimeout(() => setBulkCompleted(false), 1800); toast.success("IPC task update recorded", { description: `${taskIds.length} task${taskIds.length === 1 ? "" : "s"} updated with a human-audited change.` }); }, onError: (error) => { setBulkCompleted(false); toast.error("IPC task update blocked", { description: error.message }); } }); };
  const persistPresets = (next: IpcQueuePreset[]) => { setPresets(next); localStorage.setItem(IPC_PRESETS_STORAGE_KEY, JSON.stringify(next)); };
  const savePreset = () => { const name = window.prompt("Name this IPC queue preset"); if (!name?.trim()) return; persistPresets([...presets, { id: crypto.randomUUID(), name: name.trim(), search: taskSearch, reasonFilter, statusFilter, commentFilter, aiCategoryFilter, prioritySort }]); toast.success("Queue preset saved", { description: "Your current search, reason, comment category, and priority sort are ready for quick access." }); };
  const applyPreset = (id: string) => { const preset = presets.find((item) => item.id === id); if (!preset) return; setTaskSearch(preset.search); setReasonFilter(preset.reasonFilter); setStatusFilter(preset.statusFilter || "all"); setCommentFilter(preset.commentFilter || "all"); setAiCategoryFilter(preset.aiCategoryFilter || "all"); setPrioritySort(preset.prioritySort); };
  const filteredTasks = useMemo(() => { const query = taskSearch.trim().toLowerCase(); const taskCategories = (taskId: string) => new Set(commentAssignments.filter((entry) => entry.taskId === taskId).map((entry) => entry.category)); const filtered = tasks.filter((task) => (reasonFilter === "all" || task.reason === reasonFilter) && (statusFilter === "all" || task.status === statusFilter) && (commentFilter === "all" || Boolean(task.lastComment?.trim())) && (aiCategoryFilter === "all" || taskCategories(task.id).has(aiCategoryFilter)) && (!query || `${task.id} ${task.label} ${task.reason} ${IPC_REASON_LABELS[task.reason]} ${task.lastComment || ""}`.toLowerCase().includes(query))); return prioritySort === "none" ? filtered : [...filtered].sort((a, b) => (IPC_PRIORITY_RANK[b.priority] - IPC_PRIORITY_RANK[a.priority]) * (prioritySort === "high_to_low" ? 1 : -1)); }, [aiCategoryFilter, commentAssignments, commentFilter, reasonFilter, statusFilter, taskSearch, prioritySort, tasks]);
  const toggleTaskSelection = (id: string) => setSelectedTaskIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAllFiltered = () => setSelectedTaskIds((current) => current.length === filteredTasks.length ? [] : filteredTasks.map((task) => task.id));
  const selectedTasks = filteredTasks.filter((task) => selectedTaskIds.includes(task.id));
  const runExport = async (kind: "queue" | "selected" | "audit", action: () => void) => {
    if (exporting) return;
    setExporting(kind);
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    try { action(); } finally { window.setTimeout(() => setExporting(null), 700); }
  };
  const visibleSignals = lowResource ? signals.filter((item) => item.level !== "stable") : signals;
  return <>
    <div className="hero-panel">
      <div className="hero-copy"><div className="flex items-center gap-2 text-teal"><span className="live-pulse" /> <span className="eyebrow text-teal">IPC command · synthetic facility</span></div><h1>Make the next safe action obvious.</h1><p>Support a small hospital’s infection-prevention team with evidence-linked priorities, transparent gaps, and a human decision boundary.</p><div className="hero-evidence"><span><ShieldAlert size={13} /> RISK SIGNALS</span><span><ClipboardCheck size={13} /> EVIDENCE FIRST</span><span><LockKeyhole size={13} /> HUMAN GATE</span></div></div>
      <div className="hero-graphic flex items-center justify-center"><div className="text-center"><ShieldAlert size={42} className="mx-auto text-teal" /><p className="eyebrow mt-4">NO AUTONOMOUS DECLARATIONS</p><p className="mt-2 text-sm text-slate-600">Signals require verification before escalation.</p></div></div>
    </div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/75 p-4"><div><Eyebrow>OPERATING MODE</Eyebrow><p className="mt-1 text-sm text-slate-600">Low-resource mode keeps the queue focused on the few actions a small team can complete today.</p></div><button className={lowResource ? "primary-button" : "quiet-button"} onClick={() => setLowResource((value) => !value)}>{lowResource ? <><Check size={15} /> Low-resource mode on</> : <><WifiOff size={15} /> Enable low-resource mode</>}</button></div>
    <IpcTrendPanel fallbackTrends={data?.trends} tasks={data?.tasks || ipcTasks} onCommentAssignments={setCommentAssignments} />
    <div className="metrics-grid"><Metric label="Wards reporting" value="3/3" note="Last signal received within 60 min" icon={Activity} /><Metric label="Needs verification" value={visibleSignals.filter((item) => item.level === "urgent").length} note="No escalation without evidence" tone="coral" icon={Siren} /><Metric label="Open IPC tasks" value="7" note="Assigned to named owners" tone="amber" icon={ClipboardCheck} /><Metric label="Resource gaps" value="2" note="Visible instead of silently inferred" tone="ink" icon={UsersRound} /></div>
    <div className="overview-grid"><div className="ledger-card"><SectionHeading eyebrow="WARD SIGNALS" title="Where attention is needed" description="Synthetic observations are operational prompts, not diagnoses." /><div className="space-y-3">{visibleSignals.map((item) => <button key={item.ward} className="w-full rounded-2xl border border-line bg-paper/60 p-4 text-left transition hover:border-teal/50" onClick={() => setSelected(item)}><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{item.ward}</p><h3 className="mt-1 font-semibold text-ink">{item.signal}</h3></div><span className={`state-pill ${item.level === "urgent" ? "pill-coral" : item.level === "watch" ? "pill-amber" : "pill-teal"}`}>{item.level}</span></div><p className="mt-3 text-sm text-slate-600">{item.evidence}</p><div className="mt-3 flex flex-wrap gap-2"><span className="tag">Fresh {item.freshness}</span><span className="tag">Owner · {item.owner}</span><span className="tag">{item.resource}</span></div></button>)}</div></div><div className="ledger-card"><SectionHeading eyebrow="IPC QUEUE" title="Small-team worklist" description="Prioritized tasks preserve human ownership." action={<div className="ipc-queue-toolbar"><div className="ipc-queue-group ipc-filter-group"><div className="ipc-queue-group-label"><Filter size={13} /><span>FILTERS</span></div><div className="ipc-queue-filter-controls"><label className="ipc-task-search"><span className="sr-only">Search IPC tasks by ID or keyword</span><Search size={14} /><input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Search ID or keyword" aria-label="Search IPC tasks by ID or keyword" /></label><select className="queue-select" value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value as "all" | IpcTaskReason)} aria-label="Filter IPC tasks by escalation reason"><option value="all">All escalation reasons</option>{Object.entries(IPC_REASON_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select className="queue-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filter IPC tasks by status"><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select><select className="queue-select" value={commentFilter} onChange={(event) => setCommentFilter(event.target.value as typeof commentFilter)} aria-label="Filter IPC tasks by explanatory comments"><option value="all">All comment states</option><option value="with_comments">With explanatory comments</option></select><select className="queue-select" value={aiCategoryFilter} onChange={(event) => setAiCategoryFilter(event.target.value as typeof aiCategoryFilter)} aria-label="Filter IPC tasks by AI comment category"><option value="all">All AI comment categories</option>{(Object.keys(IPC_CATEGORY_LABELS) as IpcCommentCategory[]).map((category) => <option value={category} key={category}>{IPC_CATEGORY_LABELS[category]}</option>)}</select><select className="queue-select" value={prioritySort} onChange={(event) => setPrioritySort(event.target.value as typeof prioritySort)} aria-label="Sort IPC tasks by priority"><option value="high_to_low">Priority: High to low</option><option value="low_to_high">Priority: Low to high</option><option value="none">Priority: Original order</option></select><select className="queue-select" defaultValue="" onChange={(event) => { if (event.target.value) applyPreset(event.target.value); }} aria-label="Apply saved IPC queue preset"><option value="">Saved presets</option>{presets.map((preset) => <option value={preset.id} key={preset.id}>{preset.name}</option>)}</select></div></div><div className="ipc-queue-group ipc-export-group"><div className="ipc-queue-group-label"><Download size={13} /><span>EXPORT</span></div><div className="ipc-queue-export-controls"><UiTooltip><UiTooltipTrigger asChild><button className="quiet-button compact" onClick={savePreset}><Bookmark size={14} /> Save preset</button></UiTooltipTrigger><UiTooltipContent>Save the current search, filters, and sort order as a reusable preset.</UiTooltipContent></UiTooltip><UiTooltip><UiTooltipTrigger asChild><button className="quiet-button compact" onClick={() => void runExport("queue", () => downloadIpcTaskCsv(filteredTasks))} disabled={!filteredTasks.length || Boolean(exporting)}>{exporting === "queue" ? <Loader2 size={14} className="spin" /> : <Download size={14} />} {exporting === "queue" ? "Exporting…" : "Filtered queue"}</button></UiTooltipTrigger><UiTooltipContent>Download the tasks matching the active filters.</UiTooltipContent></UiTooltip><UiTooltip><UiTooltipTrigger asChild><button className="quiet-button compact" onClick={() => void runExport("audit", () => downloadAuditCsv(audit))} disabled={Boolean(exporting)}>{exporting === "audit" ? <Loader2 size={14} className="spin" /> : <Download size={14} />} {exporting === "audit" ? "Exporting…" : "Audit CSV"}</button></UiTooltipTrigger><UiTooltipContent>Download the visible IPC audit history for review.</UiTooltipContent></UiTooltip></div></div></div>} />
      <div className="ipc-bulk-toolbar"><label className="ipc-select-all"><input type="checkbox" checked={Boolean(filteredTasks.length && selectedTaskIds.length === filteredTasks.length)} onChange={toggleAllFiltered} aria-label="Select all filtered IPC tasks" /><span>{selectedTaskIds.length ? `${selectedTaskIds.length} selected` : "Select tasks"}</span></label>{selectedTaskIds.length > 0 && <><select className="queue-select" value={bulkPriority} onChange={(event) => setBulkPriority(event.target.value as "" | IpcTaskPriority)} aria-label="Bulk update priority"><option value="">Set priority…</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><select className="queue-select" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as "" | IpcTaskStatus)} aria-label="Bulk update status"><option value="">Set status…</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>{bulkStatus && <input className="text-input bulk-comment-input" value={bulkComment} maxLength={500} placeholder="Shared comment for this status change (optional)" aria-label="Shared explanatory comment for bulk status update" onChange={(event) => setBulkComment(event.target.value)} />}<button className="primary-button compact" disabled={taskBulkUpdate.isPending || (!bulkPriority && !bulkStatus)} onClick={() => applyTaskUpdate(selectedTaskIds, { ...(bulkPriority ? { priority: bulkPriority } : {}), ...(bulkStatus ? { status: bulkStatus } : {}) }, bulkComment)}>{taskBulkUpdate.isPending ? <Loader2 size={14} className="spin" /> : bulkCompleted ? <CheckCircle2 size={14} /> : <Save size={14} />} {taskBulkUpdate.isPending ? "Updating…" : bulkCompleted ? "Updated" : "Apply to selected"}</button><UiTooltip><UiTooltipTrigger asChild><button className="quiet-button compact" onClick={() => void runExport("selected", () => downloadIpcTaskCsv(selectedTasks))} disabled={!selectedTasks.length || Boolean(exporting)}>{exporting === "selected" ? <Loader2 size={14} className="spin" /> : <Download size={14} />} {exporting === "selected" ? "Exporting…" : "Export selected"}</button></UiTooltipTrigger><UiTooltipContent>Download only the currently selected IPC tasks.</UiTooltipContent></UiTooltip></>}{taskBulkUpdate.isPending && <div className="ipc-bulk-progress" role="status"><div className="ipc-progress-track"><span style={{ width: "72%" }} /></div><span>Updating {selectedTaskIds.length} task{selectedTaskIds.length === 1 ? "" : "s"}…</span></div>}{bulkCompleted && !taskBulkUpdate.isPending && <span className="ipc-bulk-success"><CheckCircle2 size={14} /> Saved and audited</span>}</div>
      <div className="space-y-3">{filteredTasks.map((task) => { const Icon = task.kind === "precaution" ? Siren : task.kind === "cleaning" ? Droplets : UsersRound; const priorityClass = task.priority === "high" ? "priority-high" : task.priority === "medium" ? "priority-medium" : "priority-low"; return <div className={`ipc-task-row ${selectedTaskIds.includes(task.id) ? "selected" : ""}`} key={task.id}><input type="checkbox" checked={selectedTaskIds.includes(task.id)} onChange={() => toggleTaskSelection(task.id)} aria-label={`Select ${task.label}`} /><div className="rounded-lg bg-teal/10 p-2 text-teal"><Icon size={16} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-ink">{task.label}</p><span className={`ipc-priority-badge ${priorityClass}`}>{IPC_PRIORITY_LABELS[task.priority]}</span><span className="ipc-comment-preview-wrap"><button className="ipc-comment-trigger" onClick={() => setCommentTaskId((current) => current === task.id ? null : task.id)} aria-label={`Preview comment history for ${task.label}`}><MessageSquare size={12} /> {task.commentHistory?.length ? `${task.commentHistory.length} notes` : "Note"}</button><span className="ipc-comment-preview" role="tooltip"><span className="eyebrow">COMMENT HISTORY</span>{task.commentHistory?.length ? <span className="ipc-comment-preview-scroll">{task.commentHistory.map((entry, index) => <span className={`ipc-comment-preview-item ${index === task.commentHistory!.length - 1 ? "recent" : ""}`} key={entry.id}><span className="ipc-comment-preview-meta">{new Date(entry.createdAt).toLocaleString()} · {entry.actor}</span><span>{entry.comment}</span>{index === task.commentHistory!.length - 1 && <span className="ipc-comment-preview-latest">Most recent</span>}</span>)}</span> : <span className="text-xs text-slate-500">No previous explanatory comments</span>}</span></span></div><p className="mt-1 text-xs text-slate-500">{task.id} · {IPC_REASON_LABELS[task.reason]} · {task.status.replace("_", " ")}{task.lastComment ? " · comment recorded" : ""}</p>{task.lastComment && <p className="mt-1 line-clamp-1 text-xs italic text-slate-500">“{task.lastComment}”</p>}{commentTaskId === task.id && <div className="ipc-inline-comment">{Boolean(task.commentHistory?.length) && <div className="ipc-comment-timeline"><div className="eyebrow">COMMENT HISTORY</div>{task.commentHistory?.map((entry) => <div className="ipc-comment-entry" key={entry.id}><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-slate-500">{entry.actor} · {entry.role}</span><time className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleString()}</time></div><p className="mt-1 text-xs leading-5 text-slate-600">{entry.comment}</p></div>)}</div>}<input className="text-input" value={inlineComments[task.id] || ""} maxLength={500} placeholder="Why is this status changing?" onChange={(event) => setInlineComments((current) => ({ ...current, [task.id]: event.target.value }))} /><span>{(inlineComments[task.id] || "").length}/500</span></div>}</div><select className="queue-select ipc-inline-select" value={task.status} onChange={(event) => applyTaskUpdate([task.id], { status: event.target.value as IpcTaskStatus }, inlineComments[task.id])} aria-label={`Update status for ${task.label}`}><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select><select className="queue-select ipc-inline-select" value={task.priority} onChange={(event) => applyTaskUpdate([task.id], { priority: event.target.value as IpcTaskPriority }, inlineComments[task.id])} aria-label={`Update priority for ${task.label}`}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><span className={`state-pill ${task.tone === "urgent" ? "pill-coral" : task.tone === "watch" ? "pill-amber" : "pill-teal"}`}>{task.count}</span></div>; })}</div><button className="quiet-button mt-5 w-full" onClick={() => onNavigate("audit")}><ShieldCheck size={15} /> Review IPC audit trail</button></div></div>
    {selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}><aside className="approval-drawer" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-line p-6"><div><Eyebrow>IPC EVIDENCE · SYNTHETIC</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{selected.signal}</h2><p className="mt-2 text-sm text-slate-500">{selected.ward}</p></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close evidence"><X size={18} /></button></div><div className="space-y-5 overflow-y-auto p-6"><div className="drawer-callout"><AlertTriangle size={17} /><div><p className="font-semibold text-ink">Verify before acting</p><p className="mt-1 text-sm text-slate-600">This signal is an operational prompt. It does not declare an infection or replace local IPC judgment.</p></div></div><div><Eyebrow>OBSERVED EVIDENCE</Eyebrow><p className="mt-2 text-sm leading-6 text-slate-600">{selected.evidence}</p></div><div><Eyebrow>PROPOSED NEXT CHECK</Eyebrow><p className="mt-2 text-sm leading-6 text-slate-600">{selected.action}</p></div><div><Eyebrow>VISIBLE CONSTRAINT</Eyebrow><p className="mt-2 text-sm leading-6 text-slate-600">{selected.resource}</p></div><div className="drawer-permission"><LockKeyhole size={15} /><span>Any escalation, external notice, or policy change remains behind an authenticated human approval gate.</span></div>{canReview ? <><label className="grid gap-2"><span className="eyebrow">DECISION REASON · REQUIRED FOR ESCALATE / DISMISS</span><textarea className="reason-input" rows={4} value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Document the evidence, local constraint, or verification outcome." /></label><div className="grid gap-2 sm:grid-cols-3"><button className="primary-button compact" onClick={() => { void onTransition(selected.signal, "verify"); setSelected(null); }}><Check size={15} /> Verify</button><button className="quiet-button compact" disabled={!decisionReason.trim()} onClick={() => { void onTransition(selected.signal, "escalate", decisionReason.trim()); setSelected(null); }}><ShieldAlert size={15} /> Escalate</button><button className="danger-button compact" disabled={!decisionReason.trim()} onClick={() => { void onTransition(selected.signal, "dismiss", decisionReason.trim()); setSelected(null); }}><XCircle size={15} /> Dismiss</button></div></> : <div className="drawer-permission"><LockKeyhole size={15} /><span>Your server-derived role can inspect this signal but cannot record the human-gate decision.</span></div>}</div></aside></div>}
  </>;
}

function Boundary({ icon: Icon, title, copy }: { icon: typeof LockKeyhole; title: string; copy: string }) {
  return <div className="boundary-item"><div className="boundary-icon"><Icon size={16} /></div><div><p className="font-semibold text-ink">{title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{copy}</p></div></div>;
}

function EventRow({ event }: { event: FleetEvent }) {
  const tone = event.status === "completed" ? "teal" : event.status === "blocked" ? "coral" : "amber";
  return <div className={`event-row event-row-${event.status}`}><div className="flex min-w-0 items-start gap-3"><div className={`event-mark event-${tone}`}><StatusDot status={tone} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="mono-label">{event.kind}</span><span className="text-xs text-slate-400">{event.id}</span></div><p className="mt-1 truncate text-sm font-medium text-ink">{event.detail}</p><p className="mt-1 text-xs text-slate-400">Routed to {event.routedTo} · {event.actor}</p></div></div><span className="shrink-0 text-xs text-slate-400">{formatTime(event.timestamp)}</span></div>;
}

function Registry({ agents }: { agents: FleetAgent[] }) {
  return <><SectionHeading eyebrow="DISCOVERY & LIFECYCLE" title="Agent registry" description="Approved capabilities and restrictions, published together." action={<button className="quiet-button"><Filter size={15} /> Filter registry</button>} /><div className="registry-grid">{agents.map((agent) => <div className="agent-card" key={agent.id}><div className="flex items-start justify-between gap-4"><div className="agent-mark"><Bot size={18} /></div><AutonomyPill autonomy={agent.autonomy} /></div><div className="mt-5"><h3 className="agent-title">{agent.name}</h3><p className="mt-1 text-sm text-slate-500">{agent.domain} · v{agent.version}</p></div><div className="mt-5"><p className="eyebrow">CAPABILITIES</p><div className="mt-2 flex flex-wrap gap-2">{agent.capabilities.map((item) => <span className="tag" key={item}>{item}</span>)}</div></div><div className="mt-5 border-t border-line pt-4"><p className="eyebrow">RESTRICTIONS</p><ul className="mt-2 space-y-2">{agent.restrictions.map((item) => <li className="flex items-start gap-2 text-sm text-slate-600" key={item}><ShieldCheck size={14} className="mt-0.5 shrink-0 text-teal" />{item}</li>)}</ul></div></div>)}</div></>;
}

function OpsMetricsPanel() {
  const [range, setRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const metricsInput = useMemo(() => ({ range }), [range]);
  const metrics = trpc.admin.streamMetrics.useQuery(metricsInput, { refetchInterval: 5_000, staleTime: 2_000 });
  const stream = metrics.data?.stream;
  const bridge = metrics.data?.fleetBridge;
  const history = metrics.data?.history || [];
  const chartData = history.length ? history.map((point) => ({ ...point, label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: range === "7d" ? undefined : "2-digit", minute: range === "7d" ? undefined : "2-digit" }).format(new Date(point.capturedAt)) })) : stream ? [{ capturedAt: new Date().toISOString(), label: "Now", activeConnections: stream.activeConnections, deliveryLatencyMs: stream.deliveryLatencyMs }] : [];
  const latencyStatus = (stream?.deliveryLatencyMs || 0) >= 1000 ? { label: "Critical", className: "bg-coral text-white", copy: "Latency exceeds 1 second" } : (stream?.deliveryLatencyMs || 0) >= 500 ? { label: "Watch", className: "bg-amber text-ink", copy: "Latency exceeds 500 ms" } : { label: "Healthy", className: "bg-teal text-white", copy: "Latency within 500 ms" };
  const droppedStatus = (stream?.droppedClients || 0) >= 5 ? { label: "Critical", className: "bg-coral text-white", copy: "Five or more dropped clients" } : (stream?.droppedClients || 0) > 0 ? { label: "Watch", className: "bg-amber text-ink", copy: "Dropped clients detected" } : { label: "Healthy", className: "bg-teal text-white", copy: "No dropped clients" };
  const cards = [
    { label: "Active SSE connections", value: stream?.activeConnections ?? 0, note: `${stream?.totalConnections ?? 0} opened since start`, tone: "teal" },
    { label: "Delivery latency", value: `${stream?.deliveryLatencyMs ?? 0} ms`, note: `Peak ${stream?.maxDeliveryLatencyMs ?? 0} ms`, tone: latencyStatus.label === "Critical" ? "coral" : latencyStatus.label === "Watch" ? "amber" : "teal" },
    { label: "Delivered notifications", value: stream?.deliveredNotifications ?? 0, note: `${stream?.totalNotifications ?? 0} received`, tone: "teal" },
    { label: "Dropped clients", value: stream?.droppedClients ?? 0, note: `${bridge?.failed ?? 0} bridge failures`, tone: droppedStatus.label === "Healthy" ? "teal" : "coral" },
  ];
  return <div className="ledger-card mt-6 overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5"><div><Eyebrow>OPERATIONS / REALTIME</Eyebrow><h3 className="admin-card-title">Notification stream health</h3><p className="mt-1 text-sm text-slate-500">Durable trend samples refresh every five seconds for administrators.</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs text-slate-500"><span className="sr-only">Trend time range</span><select className="queue-select" value={range} onChange={(event) => setRange(event.target.value as typeof range)} aria-label="Trend time range"><option value="1h">Last hour</option><option value="6h">Last 6 hours</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option></select></label><span className="flex items-center gap-2 text-xs text-slate-400"><span className="live-pulse small" /> {metrics.isFetching ? "Refreshing" : "Live"}</span></div></div><div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div className="bg-paper p-5" key={card.label}><p className="eyebrow">{card.label}</p><p className={`mt-3 text-3xl font-semibold tracking-tight ${card.tone === "coral" ? "text-coral" : card.tone === "amber" ? "text-amber-700" : "text-teal"}`}>{metrics.isLoading ? "—" : card.value}</p><p className="mt-2 text-xs text-slate-400">{card.note}</p></div>)}</div><div className="grid gap-5 p-5 lg:grid-cols-2"><div className="min-w-0"><div className="mb-3 flex items-center justify-between gap-3"><div><Eyebrow>CONNECTION TREND</Eyebrow><p className="text-sm font-semibold text-ink">Active SSE connections</p></div><Gauge size={17} className="text-teal" /></div><div className="h-56 w-full">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="#e7e5dc" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} /><YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9d8cf", fontSize: 12 }} /><Line type="monotone" dataKey="activeConnections" name="Connections" stroke="#087f73" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No samples in this range.</div>}</div></div><div className="min-w-0"><div className="mb-3 flex items-center justify-between gap-3"><div><Eyebrow>LATENCY TREND</Eyebrow><p className="text-sm font-semibold text-ink">Notification delivery latency</p></div><TrendingUp size={17} className={latencyStatus.label === "Healthy" ? "text-teal" : latencyStatus.label === "Watch" ? "text-amber-700" : "text-coral"} /></div><div className="h-56 w-full">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="#e7e5dc" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} /><YAxis width={38} tick={{ fontSize: 10 }} unit=" ms" /><Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9d8cf", fontSize: 12 }} /><ReferenceLine y={500} stroke="#b7791f" strokeDasharray="4 4" /><ReferenceLine y={1000} stroke="#c6534b" strokeDasharray="4 4" /><Line type="monotone" dataKey="deliveryLatencyMs" name="Latency (ms)" stroke={latencyStatus.label === "Healthy" ? "#087f73" : latencyStatus.label === "Watch" ? "#b7791f" : "#c6534b"} strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No samples in this range.</div>}</div></div></div><div className="grid gap-3 border-t border-line p-5 sm:grid-cols-2"><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${latencyStatus.className}`}>{latencyStatus.label}</span><span className="text-sm text-slate-500">Latency · {latencyStatus.copy}</span></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${droppedStatus.className}`}>{droppedStatus.label}</span><span className="text-sm text-slate-500">Dropped clients · {droppedStatus.copy}</span></div></div><div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line px-5 py-4 text-xs text-slate-500"><span>Bridge received <strong className="text-ink">{bridge?.received ?? 0}</strong></span><span>Published <strong className="text-ink">{bridge?.published ?? 0}</strong></span><span>Duplicates <strong className="text-ink">{bridge?.duplicate ?? 0}</strong></span><span>Ignored <strong className="text-ink">{bridge?.ignored ?? 0}</strong></span></div></div>;
}

function IpcPolicySettings() {
  const policyQuery = trpc.admin.ipcPolicy.useQuery({ facilityId: "default-hospital" });
  const updatePolicy = trpc.admin.updateIpcPolicy.useMutation({ onSuccess: (saved) => { const next = { facilityId: saved?.facilityId || form.facilityId, facilityName: saved?.facilityName || form.facilityName, handHygieneWatchPct: saved?.handHygieneWatchPct ?? form.handHygieneWatchPct, handHygieneCriticalPct: saved?.handHygieneCriticalPct ?? form.handHygieneCriticalPct, evidenceStaleMinutes: saved?.evidenceStaleMinutes ?? form.evidenceStaleMinutes, ppeStaleHours: saved?.ppeStaleHours ?? form.ppeStaleHours, urgentNotifications: saved?.urgentNotifications ?? form.urgentNotifications, watchNotifications: saved?.watchNotifications ?? form.watchNotifications, lowResourceDefault: saved?.lowResourceDefault ?? form.lowResourceDefault }; setForm(next); setSavedSerialized(JSON.stringify(next)); toast.success("IPC policy saved", { description: "Hospital-specific thresholds are now active." }); policyQuery.refetch(); }, onError: (error) => toast.error("IPC policy save failed", { description: error.message }) });
  const [form, setForm] = useState({ facilityId: "default-hospital", facilityName: "Community General Hospital", handHygieneWatchPct: 80, handHygieneCriticalPct: 60, evidenceStaleMinutes: 60, ppeStaleHours: 24, urgentNotifications: true, watchNotifications: true, lowResourceDefault: false });
  const [savedSerialized, setSavedSerialized] = useState("");
  const serializedForm = JSON.stringify(form);
  const isDirty = Boolean(savedSerialized) && savedSerialized !== serializedForm;
  useEffect(() => { if (policyQuery.data) { const next = { facilityId: policyQuery.data.facilityId, facilityName: policyQuery.data.facilityName, handHygieneWatchPct: policyQuery.data.handHygieneWatchPct, handHygieneCriticalPct: policyQuery.data.handHygieneCriticalPct, evidenceStaleMinutes: policyQuery.data.evidenceStaleMinutes, ppeStaleHours: policyQuery.data.ppeStaleHours, urgentNotifications: policyQuery.data.urgentNotifications, watchNotifications: policyQuery.data.watchNotifications, lowResourceDefault: policyQuery.data.lowResourceDefault }; setForm(next); setSavedSerialized(JSON.stringify(next)); } }, [policyQuery.data]);
  useEffect(() => { const warnBeforeUnload = (event: BeforeUnloadEvent) => { if (!isDirty) return; event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warnBeforeUnload); return () => window.removeEventListener("beforeunload", warnBeforeUnload); }, [isDirty]);
  const resetPolicy = () => { if (savedSerialized) setForm(JSON.parse(savedSerialized)); };
  const setNumber = (key: "handHygieneWatchPct" | "handHygieneCriticalPct" | "evidenceStaleMinutes" | "ppeStaleHours", value: string) => setForm((current) => ({ ...current, [key]: Number(value) }));
  return <div className="ledger-card admin-policy-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><Eyebrow>IPC POLICY · ADMIN ONLY</Eyebrow><h3 className="admin-card-title">Hospital-specific safety settings</h3><p className="mt-1 max-w-2xl text-sm text-slate-500">Tune operational thresholds and notification behavior without changing the model’s clinical boundary. These settings affect prioritization and alerts, not diagnosis.</p></div><div className="flex items-center gap-3">{isDirty && <span className="state-pill pill-amber" role="status">Unsaved changes</span>}<ShieldAlert size={19} className="text-teal" /></div></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="grid gap-2"><span className="eyebrow">FACILITY ID</span><input className="admin-input" value={form.facilityId} onChange={(event) => setForm((current) => ({ ...current, facilityId: event.target.value }))} /></label><label className="grid gap-2"><span className="eyebrow">FACILITY NAME</span><input className="admin-input" value={form.facilityName} onChange={(event) => setForm((current) => ({ ...current, facilityName: event.target.value }))} /></label><label className="grid gap-2"><span className="eyebrow">HAND HYGIENE · WATCH %</span><input className="admin-input" type="number" min={1} max={100} value={form.handHygieneWatchPct} onChange={(event) => setNumber("handHygieneWatchPct", event.target.value)} /></label><label className="grid gap-2"><span className="eyebrow">HAND HYGIENE · CRITICAL %</span><input className="admin-input" type="number" min={1} max={100} value={form.handHygieneCriticalPct} onChange={(event) => setNumber("handHygieneCriticalPct", event.target.value)} /></label><label className="grid gap-2"><span className="eyebrow">EVIDENCE STALE · MINUTES</span><input className="admin-input" type="number" min={5} value={form.evidenceStaleMinutes} onChange={(event) => setNumber("evidenceStaleMinutes", event.target.value)} /></label><label className="grid gap-2"><span className="eyebrow">PPE STALE · HOURS</span><input className="admin-input" type="number" min={1} value={form.ppeStaleHours} onChange={(event) => setNumber("ppeStaleHours", event.target.value)} /></label></div><div className="mt-5 flex flex-wrap gap-3"><label className="toggle-row"><input type="checkbox" checked={form.urgentNotifications} onChange={(event) => setForm((current) => ({ ...current, urgentNotifications: event.target.checked }))} /> Urgent alerts</label><label className="toggle-row"><input type="checkbox" checked={form.watchNotifications} onChange={(event) => setForm((current) => ({ ...current, watchNotifications: event.target.checked }))} /> Watch alerts</label><label className="toggle-row"><input type="checkbox" checked={form.lowResourceDefault} onChange={(event) => setForm((current) => ({ ...current, lowResourceDefault: event.target.checked }))} /> Default low-resource mode</label></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div>{isDirty && <p className="text-xs text-amber-700">Threshold edits are local until you save them. Leaving this page will prompt before discarding changes.</p>}{form.handHygieneCriticalPct >= form.handHygieneWatchPct && <p className="text-xs text-coral">Critical coverage must be lower than watch coverage.</p>}</div><div className="flex gap-2"><button className="quiet-button compact" onClick={resetPolicy} disabled={!isDirty || updatePolicy.isPending}>Reset changes</button><button className="primary-button compact" disabled={updatePolicy.isPending || !isDirty || form.handHygieneCriticalPct >= form.handHygieneWatchPct} onClick={() => updatePolicy.mutate(form)}>{updatePolicy.isPending ? <><Loader2 size={14} className="spin" /> Saving policy</> : <><Check size={14} /> Save hospital policy</>}</button></div></div></div>;
}

function AdminProfiles() {
  const profiles = trpc.admin.profiles.useQuery();
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkRole, setBulkRole] = useState<DashboardRole>("data_scientist");
  const [bulkDepartment, setBulkDepartment] = useState("Clinical analytics");
  const [bulkInitials, setBulkInitials] = useState("OP");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditQuery, setAuditQuery] = useState("");
  const [auditRole, setAuditRole] = useState<"all" | DashboardRole>("all");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const auditInput = useMemo(() => ({ page: auditPage, pageSize: 8, query: auditQuery || undefined, newRole: auditRole === "all" ? undefined : auditRole, from: auditFrom || undefined, to: auditTo || undefined }), [auditPage, auditQuery, auditRole, auditFrom, auditTo]);
  const dryRunInput = useMemo(() => ({ userIds: selected, dashboardRole: bulkRole, department: bulkDepartment, initials: bulkInitials }), [selected, bulkRole, bulkDepartment, bulkInitials]);
  const roleChanges = trpc.admin.roleChanges.useQuery(auditInput);
  const bulkDryRun = trpc.admin.bulkDryRun.useQuery(dryRunInput, { enabled: confirmOpen && selected.length > 0 });
  const update = trpc.admin.updateProfile.useMutation({ onSuccess: () => { toast.success("Operator role updated"); profiles.refetch(); roleChanges.refetch(); }, onError: (error) => toast.error("Role update failed", { description: error.message }) });
  const bulkUpdate = trpc.admin.bulkUpdateProfiles.useMutation({ onSuccess: (rows) => { toast.success("Bulk roles updated", { description: `${rows.length} operator${rows.length === 1 ? "" : "s"} changed.` }); setSelected([]); setConfirmOpen(false); profiles.refetch(); roleChanges.refetch(); }, onError: (error) => { setConfirmOpen(false); toast.error("Bulk role update failed", { description: error.message }); } });
  const roleCounts = useMemo(() => profiles.data?.reduce<Record<string, number>>((counts, item) => { counts[item.dashboardRole] = (counts[item.dashboardRole] || 0) + 1; return counts; }, {}) || {}, [profiles.data]);
  const departmentCounts = useMemo(() => profiles.data?.reduce<Record<string, number>>((counts, item) => { const department = item.department || "Unassigned"; counts[department] = (counts[department] || 0) + 1; return counts; }, {}) || {}, [profiles.data]);
  const maxRole = Math.max(1, ...Object.values(roleCounts));
  const maxDepartment = Math.max(1, ...Object.values(departmentCounts));
  const selectedProfiles = profiles.data?.filter((item) => selected.includes(item.userId)) || [];
  const totalAuditPages = Math.max(1, Math.ceil((roleChanges.data?.total || 0) / (roleChanges.data?.pageSize || 8)));
  const toggleSelected = (userId: number) => setSelected((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  const selectAll = () => setSelected(selected.length === (profiles.data?.length || 0) ? [] : profiles.data?.map((item) => item.userId) || []);
  const resetAuditPage = () => setAuditPage(1);
  return <>
    <SectionHeading eyebrow="GOVERNANCE ADMIN" title="Operator profiles" description="Assign the least-privilege dashboard role from a server-authorized admin surface." />
    <OpsMetricsPanel />
    <IpcPolicySettings />
    <div className="admin-chart-grid"><div className="ledger-card admin-chart-card"><div className="flex items-start justify-between"><div><Eyebrow>ROLE DISTRIBUTION</Eyebrow><h3 className="admin-card-title">Access by role</h3></div><ShieldCheck size={18} className="text-teal" /></div><div className="admin-bars">{Object.entries(roleCounts).map(([role, count]) => <div className="admin-bar-row" key={role}><div className="admin-bar-label"><span>{role.replaceAll("_", " ")}</span><strong>{count}</strong></div><div className="admin-bar-track"><span className="admin-bar-fill teal" style={{ width: `${(count / maxRole) * 100}%` }} /></div></div>)}{!Object.keys(roleCounts).length && <p className="text-sm text-slate-500">No role data available.</p>}</div></div><div className="ledger-card admin-chart-card"><div className="flex items-start justify-between"><div><Eyebrow>DEPARTMENT DISTRIBUTION</Eyebrow><h3 className="admin-card-title">Operators by team</h3></div><Activity size={18} className="text-amber" /></div><div className="admin-bars">{Object.entries(departmentCounts).map(([department, count]) => <div className="admin-bar-row" key={department}><div className="admin-bar-label"><span>{department}</span><strong>{count}</strong></div><div className="admin-bar-track"><span className="admin-bar-fill amber" style={{ width: `${(count / maxDepartment) * 100}%` }} /></div></div>)}{!Object.keys(departmentCounts).length && <p className="text-sm text-slate-500">No department data available.</p>}</div></div></div>
    <div className="ledger-card admin-profile-card"><div className="admin-bulk-toolbar"><div><Eyebrow>BULK CONTROL</Eyebrow><p className="text-sm font-semibold text-ink">{selected.length ? `${selected.length} selected` : "Select operators to batch edit"}</p></div><div className="admin-bulk-fields"><select className="queue-select" value={bulkRole} onChange={(event) => setBulkRole(event.target.value as DashboardRole)} aria-label="Bulk dashboard role"><option value="data_scientist">Data Scientist</option><option value="medical_director">Medical Director</option><option value="payer_operations">Payer Operations</option></select><input className="admin-input bulk-department" value={bulkDepartment} onChange={(event) => setBulkDepartment(event.target.value)} aria-label="Bulk department" /><input className="admin-input bulk-initials" value={bulkInitials} onChange={(event) => setBulkInitials(event.target.value.toUpperCase().slice(0, 8))} aria-label="Bulk initials" /><button className="primary-button compact" disabled={!selected.length || bulkUpdate.isPending} onClick={() => setConfirmOpen(true)}>{bulkUpdate.isPending ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Review changes</button></div></div><div className="admin-table-head admin-table-grid"><label className="admin-check"><input type="checkbox" checked={Boolean(profiles.data?.length && selected.length === profiles.data.length)} onChange={selectAll} aria-label="Select all operators" /></label><span>OPERATOR</span><span>DEPARTMENT</span><span>ROLE</span><span>STATUS</span></div>{profiles.data?.map((item) => <div className="admin-table-row admin-table-grid" key={item.userId}><label className="admin-check"><input type="checkbox" checked={selected.includes(item.userId)} onChange={() => toggleSelected(item.userId)} aria-label={`Select ${item.name}`} /></label><div><p className="font-semibold text-ink">{item.name}</p><p className="text-xs text-slate-400">{item.email || item.openId || `User ${item.userId}`}</p></div><input className="admin-input" defaultValue={item.department} aria-label={`Department for ${item.name}`} onBlur={(event) => { if (event.target.value !== item.department) update.mutate({ userId: item.userId, dashboardRole: item.dashboardRole, department: event.target.value, initials: item.initials }); }} /><select className="queue-select" value={item.dashboardRole} onChange={(event) => update.mutate({ userId: item.userId, dashboardRole: event.target.value as DashboardRole, department: item.department, initials: item.initials })} aria-label={`Role for ${item.name}`}><option value="data_scientist">Data Scientist</option><option value="medical_director">Medical Director</option><option value="payer_operations">Payer Operations</option></select><span className="state-pill pill-teal">{update.isPending ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Server enforced</span></div>)}{!profiles.data?.length && <div className="empty-state"><UserCog size={22} /><p>No operator profiles are available yet.</p></div>}</div>
    {confirmOpen && <div className="drawer-backdrop" onClick={() => !bulkUpdate.isPending && setConfirmOpen(false)}><div className="confirm-dialog" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><Eyebrow>ADMIN CONTROL · REVIEW</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Confirm role changes</h2><p className="mt-2 text-sm leading-6 text-slate-500">Review the before and after values. This action writes an audit entry for every changed operator.</p></div><button className="icon-button" onClick={() => setConfirmOpen(false)} disabled={bulkUpdate.isPending} aria-label="Close confirmation"><X size={18} /></button></div><div className="dry-run-summary"><span>{bulkDryRun.isLoading ? "Calculating impact…" : `${bulkDryRun.data?.changedCount || 0} changed · ${bulkDryRun.data?.unchangedCount || 0} unchanged`}</span><span className="text-xs text-slate-400">Unchanged users will not create audit rows or notifications.</span></div><div className="confirm-table"><div className="confirm-head"><span>OPERATOR</span><span>BEFORE</span><span>AFTER</span></div>{(bulkDryRun.data?.rows || selectedProfiles.map((item) => ({ userId: item.userId, name: item.name, currentRole: item.dashboardRole, currentDepartment: item.department || "", nextRole: bulkRole, nextDepartment: bulkDepartment, changed: true }))).map((item) => <div className={`confirm-row ${item.changed ? "" : "confirm-unchanged"}`} key={item.userId}><strong>{item.name}{!item.changed && <small> unchanged</small>}</strong><span>{item.currentRole.replaceAll("_", " ")} · {item.currentDepartment || "Unassigned"}</span><span className={item.changed ? "confirm-after" : ""}>{item.nextRole.replaceAll("_", " ")} · {item.nextDepartment || "Unassigned"}</span></div>)}</div><div className="mt-5 flex justify-end gap-2"><button className="quiet-button" onClick={() => setConfirmOpen(false)} disabled={bulkUpdate.isPending}>Cancel</button><button className="primary-button compact" onClick={() => bulkUpdate.mutate({ userIds: selected, dashboardRole: bulkRole, department: bulkDepartment, initials: bulkInitials })} disabled={bulkUpdate.isPending || bulkDryRun.isLoading || !bulkDryRun.data?.changedCount}>{bulkUpdate.isPending ? <><Loader2 size={14} className="spin" /> Applying</> : <><Check size={14} /> Confirm and apply</>}</button></div></div></div>}
    <div className="ledger-card admin-audit-card"><SectionHeading eyebrow="ADMIN AUDIT" title="Role-change history" description="Filter by operator, role, and UTC date range; results are paginated on the server." /><div className="audit-filter-toolbar"><input className="admin-input" value={auditQuery} onChange={(event) => { setAuditQuery(event.target.value); resetAuditPage(); }} placeholder="Search operator or department" aria-label="Search role changes" /><select className="queue-select" value={auditRole} onChange={(event) => { setAuditRole(event.target.value as "all" | DashboardRole); resetAuditPage(); }} aria-label="Filter new role"><option value="all">All roles</option><option value="data_scientist">Data Scientist</option><option value="medical_director">Medical Director</option><option value="payer_operations">Payer Operations</option></select><label className="date-filter"><span>From</span><input type="date" value={auditFrom} onChange={(event) => { setAuditFrom(event.target.value); resetAuditPage(); }} /></label><label className="date-filter"><span>To</span><input type="date" value={auditTo} onChange={(event) => { setAuditTo(event.target.value); resetAuditPage(); }} /></label></div><div className="admin-audit-list">{roleChanges.data?.rows.map((entry) => <div className="admin-audit-row" key={entry.id}><div className="audit-timeline-mark"><ShieldCheck size={14} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink">{entry.targetName}</strong><span className="mono-label">{entry.previousRole} → {entry.newRole}</span></div><p className="mt-1 text-xs text-slate-500">{entry.previousDepartment || "Unassigned"} → {entry.newDepartment || "Unassigned"}</p><p className="mt-1 text-xs text-slate-400">By {entry.actorName} · {formatDate(entry.createdAt)}</p></div></div>)}{!roleChanges.data?.rows.length && <div className="empty-state"><ShieldCheck size={22} /><p>No admin role changes match these filters.</p></div>}</div><div className="pagination-bar"><span className="text-xs text-slate-400">{roleChanges.data?.total || 0} changes · page {auditPage} of {totalAuditPages}</span><div className="flex gap-2"><button className="quiet-button compact" onClick={() => setAuditPage((current) => Math.max(1, current - 1))} disabled={auditPage <= 1 || roleChanges.isFetching}>Previous</button><button className="quiet-button compact" onClick={() => setAuditPage((current) => Math.min(totalAuditPages, current + 1))} disabled={auditPage >= totalAuditPages || roleChanges.isFetching}>Next</button></div></div></div>
  </>;
}

function Events({ snapshot, onDrain, onRefresh }: { snapshot: FleetSnapshot; onDrain: () => void; onRefresh: () => void }) {
  return <><SectionHeading eyebrow="CORE EXECUTION & STATE" title="Event stream" description="A transactional activity spine keeps asynchronous work observable." action={<div className="flex gap-2"><button className="quiet-button" onClick={onRefresh}><RefreshCw size={15} /> Refresh</button><button className="primary-button compact" onClick={onDrain}><Play size={14} /> Drain once</button></div>} /><div className="ledger-card overflow-hidden"><div className="stream-header"><span>EVENT</span><span>ROUTED TO</span><span>ACTOR</span><span>STATE</span><span>TIME</span></div>{snapshot.events.map((event) => <div className="stream-row" key={event.id}><div><span className="mono-label">{event.kind}</span><p className="mt-1 text-sm text-slate-500">{event.detail}</p></div><span className="text-sm font-medium text-ink">{event.routedTo}</span><span className="text-sm text-slate-500">{event.actor}</span><span className={`stream-state state-${event.status}`}>{event.status === "completed" ? <Check size={13} /> : event.status === "blocked" ? <X size={13} /> : <Clock3 size={13} />}{event.status}</span><span className="text-xs text-slate-400">{formatDate(event.timestamp)}</span></div>)}</div></>;
}

function downloadApprovalCsv(rows: Approval[]) {
  const headers = ["id", "status", "priority", "action", "agent", "domain", "subject", "created_at", "summary", "gemini_summary", "clinical_data", "rejection_reason"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
  const csv = [headers.join(","), ...rows.map((row) => [row.id, row.state, row.priority || "medium", row.actionType, row.agent, row.domain, row.subject, row.createdAt, row.summary, row.aiSummary || "", JSON.stringify(row.payload), row.rejectionReason || ""].map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `gemini-ops-approvals-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success("Approval CSV exported", { description: `${rows.length} filtered request${rows.length === 1 ? "" : "s"} included.` });
}

function downloadIpcTaskCsv(tasks: Array<{ id: string; label: string; count: number; tone: string; priority: IpcTaskPriority; status: IpcTaskStatus; kind: string; reason: string; lastComment?: string | null }>) {
  const headers = ["task_id", "task", "count", "priority", "status", "kind", "escalation_reason", "explanatory_comment", "exported_at"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
  const exportedAt = new Date().toISOString();
  const csv = [headers.join(","), ...tasks.map((task) => [task.id, task.label, task.count, IPC_PRIORITY_LABELS[task.priority], task.status, task.kind, IPC_REASON_LABELS[task.reason as IpcTaskReason] || task.reason, task.lastComment || "", exportedAt].map(escape).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `gemini-ops-ipc-queue-${exportedAt.slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  toast.success("IPC queue CSV exported", { description: `${tasks.length} open task${tasks.length === 1 ? "" : "s"} included.` });
}

function downloadAuditCsv(entries: AuditEntry[]) {
  const headers = ["id", "actor", "role", "tool", "outcome", "detail", "timestamp"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
  const csv = [headers.join(","), ...entries.map((entry) => [entry.id, entry.actor, entry.role, entry.tool, entry.outcome, entry.detail, entry.timestamp].map(escape).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `gemini-ops-audit-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  toast.success("Audit CSV exported", { description: `${entries.length} completed record${entries.length === 1 ? "" : "s"} included.` });
}

function ApprovalQueue({ approvals, canApprove, canSend, onApprove, onReject, onSend, onSummarize, onSelect }: { approvals: Approval[]; canApprove: boolean; canSend: boolean; onApprove: (id: string) => Promise<void>; onReject: (id: string) => void; onSend: (id: string) => Promise<void>; onSummarize: (id: string) => Promise<string>; onSelect: (approval: Approval) => void }) {
  const [status, setStatus] = useState<"all" | ApprovalState>("all");
  const [priority, setPriority] = useState<"all" | "high" | "medium" | "low">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "priority">("newest");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const pageInput = useMemo(() => ({ page, pageSize, state: status === "all" ? undefined : status, priority: priority === "all" ? undefined : priority, query: query.trim() || undefined, sort }), [page, pageSize, status, priority, query, sort]);
  const serverPage = trpc.fleet.approvalsPage.useQuery(pageInput);
  const filteredSorted = useMemo(() => approvals.filter((approval) => {
    const haystack = [approval.id, approval.subject, approval.agent, approval.domain, approval.summary, approval.rejectionReason, JSON.stringify(approval.payload), approval.evidence.join(" ")].join(" ").toLowerCase();
    return (status === "all" || approval.state === status) && (priority === "all" || approval.priority === priority) && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  }).sort((a, b) => sort === "priority" ? ({ high: 0, medium: 1, low: 2 }[a.priority || "medium"] - { high: 0, medium: 1, low: 2 }[b.priority || "medium"]) : sort === "newest" ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [approvals, status, priority, sort, query]);
  useEffect(() => { setPage(1); }, [query, status, priority, sort, pageSize]);
  const totalRows = serverPage.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const pageRows = serverPage.data?.rows ?? [];
  const selectClass = "queue-select";
  return <><SectionHeading eyebrow="HUMAN GATE" title="Approval queue" description="The fleet can prepare the action. A person owns the decision." action={<div className="queue-controls"><label className="queue-search-label"><span>Search patient ID or keyword</span><div className="queue-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="CLM-9921, denial, HbA1c…" aria-label="Search approval requests" /></div></label><label><span>Status</span><select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="sent">Sent</option></select></label><label><span>Priority</span><select className={selectClass} value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label><span>Sort</span><select className={selectClass} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="priority">Priority first</option></select></label><button className="quiet-button compact" onClick={() => downloadApprovalCsv(filteredSorted)} disabled={!totalRows}><Download size={14} /> Export CSV</button><ArrowDownUp size={15} className="queue-sort-icon" /></div>} /><div className="approval-layout"><div className="space-y-3">{pageRows.map((approval) => <ApprovalCard key={approval.id} approval={approval} canApprove={canApprove} canReject={canApprove} canSend={canSend} onApprove={onApprove} onReject={onReject} onSend={onSend} onSummarize={onSummarize} onSelect={onSelect} />)}{pageRows.length === 0 && <div className="empty-state"><Inbox size={22} /><p>No items match these filters.</p></div>}<div className="pagination-bar"><span className="pagination-count">{totalRows === 0 ? "0 requests" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalRows)} of ${totalRows}`}</span><div className="pagination-actions"><label className="page-size-label"><span>Rows</span><select className="queue-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={6}>6</option><option value={12}>12</option><option value={24}>24</option></select></label><button className="pagination-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Previous page">‹</button><span className="pagination-page">Page {Math.min(page, pageCount)} of {pageCount}</span><button className="pagination-button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} aria-label="Next page">›</button></div></div></div><div className="approval-note"><div className="note-stamp"><FileCheck2 size={17} /></div><Eyebrow>APPROVAL POLICY</Eyebrow><h3>Nothing reaches an external recipient unapproved.</h3><p>Approve records the human decision. Send is separate and returns <span className="mono-label">409</span> until that decision exists.</p><div className="policy-line"><CheckCircle2 size={15} /> Human identity resolved server-side</div><div className="policy-line"><CheckCircle2 size={15} /> Draft payload remains inspectable</div><div className="policy-line"><CheckCircle2 size={15} /> Every state change is audited</div></div></div></>;
}

function ApprovalCard({ approval, canApprove, canReject, canSend, onApprove, onReject, onSend, onSummarize, onSelect }: { approval: Approval; canApprove: boolean; canReject: boolean; canSend: boolean; onApprove: (id: string) => Promise<void>; onReject: (id: string) => void; onSend: (id: string) => Promise<void>; onSummarize: (id: string) => Promise<string>; onSelect: (approval: Approval) => void }) {
  const [summary, setSummary] = useState(approval.aiSummary || "");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const handleSummary = async () => { setSummaryLoading(true); try { const next = await onSummarize(approval.id); setSummary(next); toast.success("Gemini summary ready", { description: "The explanation is grounded in the server-provided clinical draft." }); } catch (error) { toast.error("Summary unavailable", { description: error instanceof Error ? error.message : "Gemini could not summarize this request." }); } finally { setSummaryLoading(false); } };
  const runAction = async () => { setActionLoading("approve"); try { await onApprove(approval.id); } finally { setActionLoading(null); } };
  return <div className={`approval-card approval-${approval.state}`}><div className="approval-accent" /><div className="flex-1 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="mono-label">{approval.actionType}</span><StatePill state={approval.state} /><span className={`priority-chip priority-${approval.priority || "medium"}`}>{approval.priority || "medium"} priority</span></div><h3 className="mt-3 text-lg font-semibold tracking-tight text-ink">{approval.summary}</h3><p className="mt-1 text-sm text-slate-500">{approval.agent} · {approval.domain} · {approval.subject}</p></div><button className="icon-button" aria-label="Inspect draft" onClick={() => onSelect(approval)}><ArrowUpRight size={17} /></button></div><div className="mt-4 flex flex-wrap gap-2"><button className="summary-button" onClick={handleSummary} disabled={summaryLoading}><Sparkles size={14} />{summaryLoading ? <><Loader2 size={14} className="spin" /> Generating</> : summary ? "Refresh Gemini summary" : "Explain with Gemini"}</button>{summary && <div className="ai-summary"><span className="eyebrow">GEMINI CLINICAL NOTE</span><p>{summary}</p></div>}</div><div className="mt-5 flex flex-wrap items-center gap-2"><span className="eyebrow">EVIDENCE</span>{approval.evidence.map((item) => <span className="tag" key={item}>{item}</span>)}<span className="ml-auto text-xs text-slate-400">{formatDate(approval.createdAt)}</span></div><div className="mt-5 flex flex-wrap gap-2">{approval.state === "pending" && canApprove && <button className="primary-button compact" disabled={actionLoading !== null} onClick={runAction}>{actionLoading === "approve" ? <Loader2 size={14} className="spin" /> : <Check size={14} />} {actionLoading === "approve" ? "Approving" : "Approve draft"}</button>}{approval.state === "pending" && canReject && <button className="danger-button compact" disabled={actionLoading !== null} onClick={() => onReject(approval.id)}>{actionLoading === "reject" ? <Loader2 size={14} className="spin" /> : <XCircle size={14} />} {actionLoading === "reject" ? "Rejecting" : "Reject request"}</button>}{approval.state === "pending" && canSend && <button className="danger-button compact" onClick={() => onSend(approval.id)}><Send size={14} /> Try send</button>}{approval.state === "approved" && canSend && <button className="primary-button compact" onClick={() => onSend(approval.id)}><Send size={14} /> Send approved action</button>}{approval.state !== "sent" && !canApprove && !canSend && <span className="permission-note"><LockKeyhole size={14} /> Review only · no approval authority</span>}{approval.state === "sent" && <span className="completed-copy"><CheckCircle2 size={15} /> Dispatched with audit record</span>}{approval.state === "rejected" && <span className="completed-copy rejected-copy"><XCircle size={15} /> Rejected with audit record</span>}</div></div></div>;
}

function Audit({ entries }: { entries: AuditEntry[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => entries.filter((entry) => `${entry.tool} ${entry.detail} ${entry.outcome}`.toLowerCase().includes(query.toLowerCase())), [entries, query]);
  return <><SectionHeading eyebrow="TELEMETRY" title="Audit & trace" description="Successes and refusals carry the same operational weight." action={<div className="flex flex-wrap gap-2"><div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search telemetry" /></div><button className="quiet-button compact" onClick={() => downloadAuditCsv(filtered)}><Download size={14} /> Export audit CSV</button></div>} /><div className="ledger-card overflow-hidden"><div className="audit-list">{filtered.map((entry) => { const isBad = entry.outcome === "denied" || entry.outcome === "blocked" || entry.outcome === "rejected"; return <div className="audit-row" key={entry.id}><div className={`audit-icon ${isBad ? "audit-bad" : entry.outcome === "approved" ? "audit-amber" : "audit-good"}`}>{entry.outcome === "rejected" ? <XCircle size={15} /> : isBad ? <AlertTriangle size={15} /> : entry.outcome === "approved" ? <FileCheck2 size={15} /> : <Check size={15} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-ink">{entry.tool}</span><span className={`outcome outcome-${entry.outcome}`}>{entry.outcome}</span><span className="mono-label">{entry.id}</span></div><p className="mt-1 truncate text-sm text-slate-500">{entry.detail}</p><p className="mt-1 text-xs text-slate-400">{entry.actor} · {entry.role}</p></div><span className="text-xs text-slate-400">{formatDate(entry.timestamp)}</span></div> })}</div></div></>;
}

function ApprovalDrawer({ approval, canApprove, canReject, canSend, onClose, onApprove, onReject, onSend, onSummarize }: { approval: Approval | null; canApprove: boolean; canReject: boolean; canSend: boolean; onClose: () => void; onApprove: (id: string) => void; onReject: (id: string) => void; onSend: (id: string) => void; onSummarize: (id: string) => Promise<string> }) {
  const [summary, setSummary] = useState(approval?.aiSummary || "");
  const [summaryLoading, setSummaryLoading] = useState(false);
  useEffect(() => { setSummary(approval?.aiSummary || ""); setSummaryLoading(false); }, [approval?.id, approval?.aiSummary]);
  if (!approval) return null;
  const handleSummary = async () => { setSummaryLoading(true); try { setSummary(await onSummarize(approval.id)); } catch (error) { toast.error("Summary unavailable", { description: error instanceof Error ? error.message : "Gemini could not summarize this request." }); } finally { setSummaryLoading(false); } };
  return <div className="drawer-backdrop" onClick={onClose}><aside className="approval-drawer" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-line p-6"><div><Eyebrow>APPROVAL DETAIL · {approval.id}</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{approval.summary}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close detail"><X size={18} /></button></div><div className="space-y-6 overflow-y-auto p-6"><div className="drawer-callout"><AlertTriangle size={17} /><div><p className="font-semibold text-ink">Synthetic healthcare action</p><p className="mt-1 text-sm text-slate-600">Review the evidence and destination before changing state.</p></div></div><div><Eyebrow>STATUS</Eyebrow><div className="mt-2"><StatePill state={approval.state} /></div></div><div><Eyebrow>REQUESTED BY</Eyebrow><p className="mt-2 text-sm text-ink">{approval.agent} · {approval.domain}</p><p className="mt-1 text-sm text-slate-500">{approval.subject}</p></div><div><Eyebrow>SUPPORTING EVIDENCE</Eyebrow><div className="mt-2 flex flex-wrap gap-2">{approval.evidence.map((item) => <span className="tag" key={item}>{item}</span>)}</div></div><div><Eyebrow>FULL CLINICAL DATA</Eyebrow><details className="clinical-details" open><summary>Show server-authorized payload</summary><pre>{JSON.stringify(approval.payload, null, 2)}</pre></details></div><div className="summary-panel"><div className="flex items-center justify-between gap-3"><Eyebrow>GEMINI CLINICAL SUMMARY</Eyebrow><button className="summary-button" onClick={handleSummary} disabled={summaryLoading}>{summaryLoading ? <><Loader2 size={14} className="spin" /> Generating</> : <><Sparkles size={14} /> {summary ? "Refresh summary" : "Generate summary"}</>}</button></div>{summary ? <p className="mt-3 text-sm leading-6 text-slate-600">{summary}</p> : <p className="mt-3 text-sm leading-6 text-slate-400">No explanation generated yet. Use Gemini to create a concise, evidence-grounded note.</p>}</div>{approval.rejectionReason && <div className="rejection-history"><Eyebrow>REJECTION REASON</Eyebrow><p>{approval.rejectionReason}</p><span>{approval.rejectedBy ? `Recorded by ${approval.rejectedBy}` : "Recorded in audit history"}</span></div>}<div className="drawer-actions">{approval.state === "pending" && canApprove && <button className="primary-button w-full" onClick={() => { onApprove(approval.id); onClose(); }}><Check size={16} /> Approve draft</button>}{approval.state === "pending" && canReject && <button className="danger-button w-full" onClick={() => { onReject(approval.id); onClose(); }}><XCircle size={16} /> Reject request</button>}{approval.state === "pending" && canSend && <button className="danger-button w-full" onClick={() => { onSend(approval.id); onClose(); }}><Send size={16} /> Attempt send before approval</button>}{approval.state === "approved" && canSend && <button className="primary-button w-full" onClick={() => { onSend(approval.id); onClose(); }}><Send size={16} /> Send approved action</button>}{!canApprove && !canSend && <div className="drawer-permission"><LockKeyhole size={15} /><span>Your server-derived role can inspect this draft but cannot approve or send it.</span></div>}</div></div></aside></div>;
}

function RejectionDialog({ approval, onClose, onConfirm }: { approval: Approval | null; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setReason(""); setSaving(false); }, [approval?.id]);
  if (!approval) return null;
  const submit = async () => { if (!reason.trim()) { toast.error("Reason required", { description: "Enter why this request should be denied before continuing." }); return; } setSaving(true); try { await onConfirm(reason.trim()); onClose(); } finally { setSaving(false); } };
  return <div className="drawer-backdrop" onClick={onClose}><div className="rejection-dialog" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><Eyebrow>HUMAN GATE · REJECTION</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Why should this request be denied?</h2><p className="mt-2 text-sm leading-6 text-slate-500">This reason becomes part of the permanent audit history for {approval.subject}.</p></div><button className="icon-button" onClick={onClose} aria-label="Close rejection dialog"><X size={18} /></button></div><label className="mt-6 grid gap-2"><span className="eyebrow">REJECTION REASON · REQUIRED</span><textarea className="reason-input" rows={5} autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: Evidence does not support the requested intervention; route back for clinical review." /></label><div className="mt-5 flex justify-end gap-2"><button className="quiet-button" onClick={onClose} disabled={saving}>Cancel</button><button className="danger-button" onClick={submit} disabled={saving || !reason.trim()}>{saving ? <><Loader2 size={15} className="spin" /> Saving rejection</> : <><XCircle size={15} /> Reject with reason</>}</button></div></div></div>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>(() => { const requested = new URLSearchParams(window.location.search).get("tab"); return tabs.some((tab) => tab.id === requested) ? requested as TabId : "overview"; });
  const [snapshot, setSnapshot] = useState<FleetSnapshot>(() => ({ ...demoSnapshot }));
  const [profile, setProfile] = useState<OperatorProfile>(() => ({ ...demoProfile }));
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [rejectionApproval, setRejectionApproval] = useState<Approval | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(() => new URLSearchParams(window.location.search).get("inbox") === "1");
  const baseUrl = import.meta.env.VITE_FLEET_API_URL || "";
  const token = import.meta.env.VITE_FLEET_TOKEN || "demo-medical-director";
  const fleetProfileQuery = trpc.fleet.profile.useQuery();
  const fleetSnapshotQuery = trpc.fleet.snapshot.useQuery();
  const fleetTelemetryQuery = trpc.fleet.telemetry.useQuery();
  const infectionControlQuery = trpc.fleet.infectionControl.useQuery();
  const notificationsQuery = trpc.fleet.notifications.useQuery();
  const notificationPreferencesQuery = trpc.fleet.notificationPreferences.useQuery();
  const markNotificationsRead = trpc.fleet.markNotificationsRead.useMutation();
  const transitionMutation = trpc.fleet.transition.useMutation();
  const infectionControlTransitionMutation = trpc.fleet.infectionControlTransition.useMutation();
  const summarizeMutation = trpc.fleet.summarize.useMutation();
  const permissions = rolePermissions[profile.role];
  const scoped = useMemo(() => scopeSnapshot(snapshot, profile), [snapshot, profile]);
  const visibleTabs = tabs.filter((tab) => tab.id === "admin" ? profile.isAdmin === true : permissions.allowedTabs.includes(tab.id));

  useEffect(() => { if (fleetProfileQuery.data) setProfile({ ...fleetProfileQuery.data, source: "server" }); }, [fleetProfileQuery.data]);
  useEffect(() => { if (fleetSnapshotQuery.data) setSnapshot((current) => ({ ...current, approvals: fleetSnapshotQuery.data.approvals, audit: fleetSnapshotQuery.data.audit })); }, [fleetSnapshotQuery.data]);
  useEffect(() => { if (fleetTelemetryQuery.data) setSnapshot((current) => ({ ...current, runtime: { ...current.runtime, ...(fleetTelemetryQuery.data.runtime[0] || {}) } as FleetSnapshot["runtime"], agents: fleetTelemetryQuery.data.agents, events: fleetTelemetryQuery.data.events })); }, [fleetTelemetryQuery.data]);
  useEffect(() => { if (baseUrl || typeof EventSource === "undefined") return; const source = new EventSource("/api/notifications/stream"); source.addEventListener("notification", (event) => { const item = JSON.parse((event as MessageEvent).data) as { title: string; message: string }; if (notificationPreferencesQuery.data?.toastEnabled !== false) toast.info(item.title, { description: item.message }); notificationsQuery.refetch(); }); source.onerror = () => source.close(); return () => source.close(); }, [baseUrl, notificationPreferencesQuery.data?.toastEnabled]);
  const refresh = async () => { setIsLoading(true); try { if (baseUrl) { const [nextProfile, data] = await Promise.all([loadOperatorProfile(baseUrl, token), loadFleetSnapshot(baseUrl, token)]); setProfile(nextProfile); setSnapshot(data); } else { await Promise.all([fleetProfileQuery.refetch(), fleetSnapshotQuery.refetch()]); } setLastRefresh(new Date()); } finally { setIsLoading(false); } };
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("inbox") === "1") setNotificationOpen(true); }, []);
  useEffect(() => { if (profile.source === "demo" || profile.isAdmin === undefined) return; if (activeTab === "admin" ? !profile.isAdmin : !permissions.allowedTabs.includes(activeTab)) setActiveTab("overview"); }, [profile.source, profile.role, profile.isAdmin, activeTab, permissions.allowedTabs]);

  const mutateApproval = async (id: string, action: "approve" | "reject" | "send", rejectionReason = "") => {
    const target = scoped.approvals.find((item) => item.id === id);
    if (!target) return;
    if ((action === "approve" || action === "reject") && !permissions.canApprove) { toast.error("Permission boundary", { description: "Your server-derived role cannot change this workflow state." }); return; }
    if (action === "send" && !permissions.canSend) { toast.error("Permission boundary", { description: "Your server-derived role cannot dispatch this action." }); return; }
    if (action === "send" && target.state === "pending") { toast.error("409 · Send refused", { description: "No human sign-off is on record. The draft remains safely held." }); return; }
    try {
      if (baseUrl) {
        if (action === "approve") await approveDraft(baseUrl, token, id);
        if (action === "reject") await rejectDraft(baseUrl, token, id, rejectionReason);
        if (action === "send") await sendDraft(baseUrl, token, id);
      } else {
        await transitionMutation.mutateAsync({ id, action, reason: rejectionReason || undefined });
      }
    } catch (error) { toast.error(action === "approve" ? "Approval failed" : action === "reject" ? "Rejection failed" : "Send refused", { description: error instanceof Error ? error.message : "The governance API rejected this action." }); return; }
    const nextState = action === "approve" ? "approved" : action === "reject" ? "rejected" : "sent";
    setSnapshot((current) => ({ ...current, approvals: current.approvals.map((item) => item.id === id ? { ...item, state: nextState, approvedBy: action === "approve" ? profile.name : item.approvedBy, rejectedBy: action === "reject" ? profile.name : item.rejectedBy, rejectionReason: action === "reject" ? rejectionReason : item.rejectionReason } : item), audit: [{ id: `aud-${Date.now()}`, actor: action === "send" ? "approval-service" : profile.name, role: profile.role, tool: action, outcome: action === "approve" ? "approved" : action === "reject" ? "rejected" : "sent", detail: action === "approve" ? "Human sign-off recorded for synthetic action." : action === "reject" ? `Human rejection recorded. Reason: ${rejectionReason}` : "Approved synthetic action dispatched.", timestamp: new Date().toISOString() }, ...current.audit] }));
    toast.success(action === "approve" ? "Workflow approved" : action === "reject" ? "Workflow rejected" : "Action dispatched", { description: action === "approve" ? "The human decision is now recorded." : action === "reject" ? "The request is closed with an audit record." : "The approved action has an audit trail." });
  };

  const requestReject = (id: string) => setRejectionApproval(scoped.approvals.find((item) => item.id === id) || null);

  const summarizeApproval = async (id: string) => {
    if (!baseUrl) {
      const result = await summarizeMutation.mutateAsync({ id });
      const summary = result?.aiSummary || "";
      setSnapshot((current) => ({ ...current, approvals: current.approvals.map((item) => item.id === id ? { ...item, aiSummary: summary } : item) }));
      return summary;
    }
    const summary = await generateApprovalSummary(baseUrl, token, id);
    setSnapshot((current) => ({ ...current, approvals: current.approvals.map((item) => item.id === id ? { ...item, aiSummary: summary } : item) }));
    return summary;
  };

  const onDrain = async () => { await drainEvents(baseUrl, token); toast.success("Drain requested", { description: "The outbox worker was asked to process pending events." }); await refresh(); };
  const recordIpcTransition = async (signal: string, action: "verify" | "escalate" | "dismiss", reason?: string) => { try { await infectionControlTransitionMutation.mutateAsync({ signal, action, reason }); toast.success(action === "verify" ? "IPC verification recorded" : action === "escalate" ? "IPC signal escalated" : "IPC signal dismissed", { description: "The human review decision was added to the audit trail." }); } catch (error) { toast.error("IPC decision failed", { description: error instanceof Error ? error.message : "The server rejected this human-gate decision." }); } };
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label;

  return <div className="app-shell"><div className={`mobile-scrim ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} /><aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}><div className="brand"><div className="brand-mark" aria-hidden="true"><HeartPulse size={19} /></div><div><p className="brand-name">GEMINI OPS</p><p className="brand-sub">Fleet / clinical ledger</p></div><button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div><div className="sidebar-section"><Eyebrow>COMMAND</Eyebrow><nav className="nav-list">{visibleTabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} className={`nav-item ${activeTab === tab.id ? "active" : ""}`} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}><Icon size={17} /><span>{tab.label}</span>{tab.id === "approvals" && scoped.approvals.filter((a) => a.state === "pending").length > 0 && <span className="nav-count">{scoped.approvals.filter((a) => a.state === "pending").length}</span>}</button>; })}</nav></div><div className="sidebar-bottom"><div className="sidebar-note"><div className="flex items-center gap-2 text-teal"><ShieldCheck size={16} /><span className="eyebrow text-teal">GOVERNANCE ACTIVE</span></div><p>Restrictions are enforced in code, not prompt text.</p></div><div className="operator"><div className="avatar">{profile.initials}</div><div><p className="text-sm font-semibold text-ink">{profile.name}</p><p className="text-xs text-slate-500">{profile.roleLabel} · {profile.source === "server" ? profile.department : "demo"}</p></div><ChevronRight size={15} className="ml-auto text-slate-400" /></div></div></aside><main className="main-area"><header className="topbar"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button><div><Eyebrow>OPERATIONS CONSOLE / {activeLabel?.toUpperCase()}</Eyebrow><p className="topbar-title">Healthcare agent command center</p></div><div className="topbar-actions"><button className="icon-button notification-button" onClick={() => setNotificationOpen(true)} aria-label="Open notifications"><Bell size={17} />{(notificationsQuery.data || []).some((item) => !item.readAt) && <span className="notification-dot" />}</button><div className="runtime-chip"><span className="live-pulse small" /> <span>Cloud runtime</span><span className="runtime-divider" /> <span className="mono-label">{snapshot.runtime.model}</span></div><button className="icon-button" onClick={refresh} aria-label="Refresh dashboard"><RefreshCw size={17} className={isLoading ? "spin" : ""} /></button></div></header><div className="content"><div className="content-head"><div><p className="breadcrumb">GEMINI OPS FLEET <ChevronRight size={13} /> CONTROL SURFACE</p></div><p className="last-refresh">Last refreshed {formatTime(lastRefresh.toISOString())}</p></div>{activeTab === "overview" && <Overview snapshot={scoped} canReviewApprovals={permissions.allowedTabs.includes("approvals")} onNavigate={setActiveTab} />}{activeTab === "registry" && <Registry agents={scoped.agents} />}{activeTab === "events" && <Events snapshot={scoped} onDrain={onDrain} onRefresh={refresh} />}{activeTab === "approvals" && <ApprovalQueue approvals={scoped.approvals} canApprove={permissions.canApprove} canSend={permissions.canSend} onApprove={(id) => mutateApproval(id, "approve")} onReject={requestReject} onSend={(id) => mutateApproval(id, "send")} onSummarize={summarizeApproval} onSelect={setSelectedApproval} />}{activeTab === "audit" && <Audit entries={scoped.audit} />}{activeTab === "infection" && <InfectionControl onNavigate={setActiveTab} data={infectionControlQuery.data} canReview={permissions.canApprove} audit={scoped.audit} onTransition={recordIpcTransition} />}{activeTab === "admin" && profile.isAdmin && <AdminProfiles />}</div><footer className="footer"><span><HeartPulse size={14} /> Synthetic data only · governance prototype</span><span className="footer-right"><span className="live-pulse small" /> All systems reporting</span></footer></main><ApprovalDrawer approval={selectedApproval} canApprove={permissions.canApprove} canReject={permissions.canApprove} canSend={permissions.canSend} onClose={() => setSelectedApproval(null)} onApprove={(id) => mutateApproval(id, "approve")} onReject={requestReject} onSend={(id) => mutateApproval(id, "send")} onSummarize={summarizeApproval} /><RejectionDialog approval={rejectionApproval} onClose={() => setRejectionApproval(null)} onConfirm={(reason) => rejectionApproval ? mutateApproval(rejectionApproval.id, "reject", reason) : Promise.resolve()} /><NotificationInbox open={notificationOpen} onClose={() => { setNotificationOpen(false); markNotificationsRead.mutate(); }} /></div>;
}
