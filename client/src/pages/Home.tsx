// Clinical Command Ledger design: warm paper surfaces, visible governance states, and evidence-led healthcare operations.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import NotificationInbox from "@/components/NotificationInbox";
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  ArrowUpRight,
  Bell,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
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
  Play,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  XCircle,
  Zap,
  UserCog,
} from "lucide-react";
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
    allowedTabs: ["overview", "registry", "events", "audit"],
    canApprove: false,
    canSend: false,
    approvalDomains: [],
    summary: "Analytics view · approvals remain with accountable operators",
  },
  medical_director: {
    allowedTabs: ["overview", "registry", "events", "approvals", "audit"],
    canApprove: true,
    canSend: true,
    approvalDomains: ["Payer operations", "Clinical operations"],
    summary: "Full clinical governance view · approval authority enabled",
  },
  payer_operations: {
    allowedTabs: ["overview", "registry", "events", "approvals", "audit"],
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
  return <div className="mb-5 flex items-end justify-between gap-4"><div><Eyebrow>{eyebrow}</Eyebrow><h2 className="section-title">{title}</h2>{description && <p className="section-description">{description}</p>}</div>{action}</div>;
}

function Overview({ snapshot, canReviewApprovals, onNavigate }: { snapshot: FleetSnapshot; canReviewApprovals: boolean; onNavigate: (tab: TabId) => void }) {
  const pending = snapshot.approvals.filter((a) => a.state === "pending").length;
  const blocked = snapshot.audit.filter((a) => a.outcome === "blocked" || a.outcome === "denied").length;
  const completed = snapshot.events.filter((e) => e.status === "completed").length;
  return <>
    <div className="hero-panel">
      <div className="hero-copy"><div className="flex items-center gap-2 text-teal"><span className="live-pulse" /> <span className="eyebrow text-teal">Fleet live · synthetic environment</span></div><h1>Automation with a visible boundary.</h1><p>Gemini agents are handling the operational work. The decision surface stays with the people accountable for it.</p><div className="hero-evidence"><span><Radio size={13} /> ASYNC ROUTING</span><span><Database size={13} /> SQL SCOPE</span><span><FileCheck2 size={13} /> HUMAN GATE</span></div><button className="primary-button" onClick={() => onNavigate(canReviewApprovals ? "approvals" : "events")}>{canReviewApprovals ? "Review human gate" : "Inspect event stream"} <ArrowUpRight size={16} /></button></div>
      <div className="hero-graphic"><img src="/manus-storage/governance-flow-abstract_53690f08.jpg" alt="Abstract event stream crossing governance checkpoints" /><div className="hero-graphic-label"><span className="eyebrow">LATEST CONTROLLED FLOW</span><strong>denial.received → payer intelligence</strong></div></div>
    </div>
    <div className="metrics-grid"><Metric label="Agents online" value={`${snapshot.agents.length}/4`} note="All registered scopes healthy" icon={Bot} /><Metric label="Events completed" value={completed} note="Across the shared event spine" icon={Zap} /><Metric label="Needs approval" value={pending} note="Nothing dispatches by itself" tone="amber" icon={Clock3} /><Metric label="Protected calls" value={blocked} note="Denied or blocked before model" tone="coral" icon={LockKeyhole} /></div>
    <div className="overview-grid">
      <div className="ledger-card"><SectionHeading eyebrow="ASYNC EVENT" title="Latest activity" description="The fleet works from events, not prompts." action={<button className="text-button" onClick={() => onNavigate("events")}>View stream <ChevronRight size={15} /></button>} /><div className="activity-list">{snapshot.events.slice(0, 4).map((event) => <EventRow key={event.id} event={event} />)}</div></div>
      <div className="ledger-card boundary-card"><SectionHeading eyebrow="CONTROL MARGIN" title="What the fleet cannot do" description="These restrictions are enforced outside the model." /><div className="boundary-list"><Boundary icon={LockKeyhole} title="Identity is server-derived" copy="No tool accepts a role or employee ID argument." /><Boundary icon={Database} title="Retrieval is filtered first" copy="SQL scope runs before ranking or synthesis." /><Boundary icon={FileCheck2} title="Outbound actions need a human" copy="Drafts queue; send returns 409 without sign-off." /></div><button className="quiet-button w-full" onClick={() => onNavigate("audit")}>Inspect refusal telemetry <ArrowUpRight size={15} /></button></div>
    </div>
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
  const metrics = trpc.admin.streamMetrics.useQuery(undefined, { refetchInterval: 5_000, staleTime: 2_000 });
  const stream = metrics.data?.stream;
  const bridge = metrics.data?.fleetBridge;
  const cards = [
    { label: "Active SSE connections", value: stream?.activeConnections ?? 0, note: `${stream?.totalConnections ?? 0} opened since start`, tone: "teal" },
    { label: "Delivery latency", value: `${stream?.deliveryLatencyMs ?? 0} ms`, note: `Peak ${stream?.maxDeliveryLatencyMs ?? 0} ms`, tone: "amber" },
    { label: "Delivered notifications", value: stream?.deliveredNotifications ?? 0, note: `${stream?.totalNotifications ?? 0} received`, tone: "teal" },
    { label: "Dropped clients", value: stream?.droppedClients ?? 0, note: `${bridge?.failed ?? 0} bridge failures`, tone: "coral" },
  ];
  return <div className="ledger-card mt-6 overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5"><div><Eyebrow>OPERATIONS / REALTIME</Eyebrow><h3 className="admin-card-title">Notification stream health</h3><p className="mt-1 text-sm text-slate-500">Protected process metrics refresh every five seconds for administrators.</p></div><div className="flex items-center gap-2 text-xs text-slate-400"><span className="live-pulse small" /> {metrics.isFetching ? "Refreshing" : "Live"}</div></div><div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div className="bg-paper p-5" key={card.label}><p className="eyebrow">{card.label}</p><p className={`mt-3 text-3xl font-semibold tracking-tight ${card.tone === "coral" ? "text-coral" : card.tone === "amber" ? "text-amber-700" : "text-teal"}`}>{metrics.isLoading ? "—" : card.value}</p><p className="mt-2 text-xs text-slate-400">{card.note}</p></div>)}</div><div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line px-5 py-4 text-xs text-slate-500"><span>Bridge received <strong className="text-ink">{bridge?.received ?? 0}</strong></span><span>Published <strong className="text-ink">{bridge?.published ?? 0}</strong></span><span>Duplicates <strong className="text-ink">{bridge?.duplicate ?? 0}</strong></span><span>Ignored <strong className="text-ink">{bridge?.ignored ?? 0}</strong></span></div></div>;
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
  return <><SectionHeading eyebrow="TELEMETRY" title="Audit & trace" description="Successes and refusals carry the same operational weight." action={<div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search telemetry" /></div>} /><div className="ledger-card overflow-hidden"><div className="audit-list">{filtered.map((entry) => { const isBad = entry.outcome === "denied" || entry.outcome === "blocked" || entry.outcome === "rejected"; return <div className="audit-row" key={entry.id}><div className={`audit-icon ${isBad ? "audit-bad" : entry.outcome === "approved" ? "audit-amber" : "audit-good"}`}>{entry.outcome === "rejected" ? <XCircle size={15} /> : isBad ? <AlertTriangle size={15} /> : entry.outcome === "approved" ? <FileCheck2 size={15} /> : <Check size={15} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-ink">{entry.tool}</span><span className={`outcome outcome-${entry.outcome}`}>{entry.outcome}</span><span className="mono-label">{entry.id}</span></div><p className="mt-1 truncate text-sm text-slate-500">{entry.detail}</p><p className="mt-1 text-xs text-slate-400">{entry.actor} · {entry.role}</p></div><span className="text-xs text-slate-400">{formatDate(entry.timestamp)}</span></div> })}</div></div></>;
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
  const [activeTab, setActiveTab] = useState<TabId>(() => new URLSearchParams(window.location.search).get("tab") === "admin" ? "admin" : "overview");
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
  const notificationsQuery = trpc.fleet.notifications.useQuery();
  const notificationPreferencesQuery = trpc.fleet.notificationPreferences.useQuery();
  const markNotificationsRead = trpc.fleet.markNotificationsRead.useMutation();
  const transitionMutation = trpc.fleet.transition.useMutation();
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
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label;

  return <div className="app-shell"><div className={`mobile-scrim ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} /><aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}><div className="brand"><img src="/manus-storage/fleet-ledger-mark_8336d777.png" alt="Gemini Ops Fleet mark" /><div><p className="brand-name">GEMINI OPS</p><p className="brand-sub">Fleet / clinical ledger</p></div><button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div><div className="sidebar-section"><Eyebrow>COMMAND</Eyebrow><nav className="nav-list">{visibleTabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} className={`nav-item ${activeTab === tab.id ? "active" : ""}`} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}><Icon size={17} /><span>{tab.label}</span>{tab.id === "approvals" && scoped.approvals.filter((a) => a.state === "pending").length > 0 && <span className="nav-count">{scoped.approvals.filter((a) => a.state === "pending").length}</span>}</button>; })}</nav></div><div className="sidebar-bottom"><div className="sidebar-note"><div className="flex items-center gap-2 text-teal"><ShieldCheck size={16} /><span className="eyebrow text-teal">GOVERNANCE ACTIVE</span></div><p>Restrictions are enforced in code, not prompt text.</p></div><div className="operator"><div className="avatar">{profile.initials}</div><div><p className="text-sm font-semibold text-ink">{profile.name}</p><p className="text-xs text-slate-500">{profile.roleLabel} · {profile.source === "server" ? profile.department : "demo"}</p></div><ChevronRight size={15} className="ml-auto text-slate-400" /></div></div></aside><main className="main-area"><header className="topbar"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button><div><Eyebrow>OPERATIONS CONSOLE / {activeLabel?.toUpperCase()}</Eyebrow><p className="topbar-title">Healthcare agent command center</p></div><div className="topbar-actions"><button className="icon-button notification-button" onClick={() => setNotificationOpen(true)} aria-label="Open notifications"><Bell size={17} />{(notificationsQuery.data || []).some((item) => !item.readAt) && <span className="notification-dot" />}</button><div className="runtime-chip"><span className="live-pulse small" /> <span>Cloud runtime</span><span className="runtime-divider" /> <span className="mono-label">{snapshot.runtime.model}</span></div><button className="icon-button" onClick={refresh} aria-label="Refresh dashboard"><RefreshCw size={17} className={isLoading ? "spin" : ""} /></button></div></header><div className="content"><div className="content-head"><div><p className="breadcrumb">GEMINI OPS FLEET <ChevronRight size={13} /> CONTROL SURFACE</p></div><p className="last-refresh">Last refreshed {formatTime(lastRefresh.toISOString())}</p></div>{activeTab === "overview" && <Overview snapshot={scoped} canReviewApprovals={permissions.allowedTabs.includes("approvals")} onNavigate={setActiveTab} />}{activeTab === "registry" && <Registry agents={scoped.agents} />}{activeTab === "events" && <Events snapshot={scoped} onDrain={onDrain} onRefresh={refresh} />}{activeTab === "approvals" && <ApprovalQueue approvals={scoped.approvals} canApprove={permissions.canApprove} canSend={permissions.canSend} onApprove={(id) => mutateApproval(id, "approve")} onReject={requestReject} onSend={(id) => mutateApproval(id, "send")} onSummarize={summarizeApproval} onSelect={setSelectedApproval} />}{activeTab === "audit" && <Audit entries={scoped.audit} />}{activeTab === "admin" && profile.isAdmin && <AdminProfiles />}</div><footer className="footer"><span><HeartPulse size={14} /> Synthetic data only · governance prototype</span><span className="footer-right"><span className="live-pulse small" /> All systems reporting</span></footer></main><ApprovalDrawer approval={selectedApproval} canApprove={permissions.canApprove} canReject={permissions.canApprove} canSend={permissions.canSend} onClose={() => setSelectedApproval(null)} onApprove={(id) => mutateApproval(id, "approve")} onReject={requestReject} onSend={(id) => mutateApproval(id, "send")} onSummarize={summarizeApproval} /><RejectionDialog approval={rejectionApproval} onClose={() => setRejectionApproval(null)} onConfirm={(reason) => rejectionApproval ? mutateApproval(rejectionApproval.id, "reject", reason) : Promise.resolve()} /><NotificationInbox open={notificationOpen} onClose={() => { setNotificationOpen(false); markNotificationsRead.mutate(); }} /></div>;
}
