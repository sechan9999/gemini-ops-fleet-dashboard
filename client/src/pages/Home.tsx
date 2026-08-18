// Clinical Command Ledger design: warm paper surfaces, visible governance states, and evidence-led healthcare operations.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  FileCheck2,
  Filter,
  HeartPulse,
  Inbox,
  LockKeyhole,
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
} from "lucide-react";
import {
  Approval,
  ApprovalState,
  AuditEntry,
  FleetAgent,
  FleetEvent,
  FleetSnapshot,
  approveDraft,
  drainEvents,
  loadFleetSnapshot,
  sendDraft,
  demoSnapshot,
} from "@/lib/fleet-api";

const tabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "registry", label: "Agent registry", icon: Bot },
  { id: "events", label: "Event stream", icon: Radio },
  { id: "approvals", label: "Approval queue", icon: FileCheck2 },
  { id: "audit", label: "Audit & trace", icon: ShieldCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];

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

function Overview({ snapshot, onNavigate }: { snapshot: FleetSnapshot; onNavigate: (tab: TabId) => void }) {
  const pending = snapshot.approvals.filter((a) => a.state === "pending").length;
  const blocked = snapshot.audit.filter((a) => a.outcome === "blocked" || a.outcome === "denied").length;
  const completed = snapshot.events.filter((e) => e.status === "completed").length;
  return <>
    <div className="hero-panel">
      <div className="hero-copy"><div className="flex items-center gap-2 text-teal"><span className="live-pulse" /> <span className="eyebrow text-teal">Fleet live · synthetic environment</span></div><h1>Automation with a visible boundary.</h1><p>Gemini agents are handling the operational work. The decision surface stays with the people accountable for it.</p><div className="hero-evidence"><span><Radio size={13} /> ASYNC ROUTING</span><span><Database size={13} /> SQL SCOPE</span><span><FileCheck2 size={13} /> HUMAN GATE</span></div><button className="primary-button" onClick={() => onNavigate("approvals")}>Review human gate <ArrowUpRight size={16} /></button></div>
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

function Events({ snapshot, onDrain, onRefresh }: { snapshot: FleetSnapshot; onDrain: () => void; onRefresh: () => void }) {
  return <><SectionHeading eyebrow="CORE EXECUTION & STATE" title="Event stream" description="A transactional activity spine keeps asynchronous work observable." action={<div className="flex gap-2"><button className="quiet-button" onClick={onRefresh}><RefreshCw size={15} /> Refresh</button><button className="primary-button compact" onClick={onDrain}><Play size={14} /> Drain once</button></div>} /><div className="ledger-card overflow-hidden"><div className="stream-header"><span>EVENT</span><span>ROUTED TO</span><span>ACTOR</span><span>STATE</span><span>TIME</span></div>{snapshot.events.map((event) => <div className="stream-row" key={event.id}><div><span className="mono-label">{event.kind}</span><p className="mt-1 text-sm text-slate-500">{event.detail}</p></div><span className="text-sm font-medium text-ink">{event.routedTo}</span><span className="text-sm text-slate-500">{event.actor}</span><span className={`stream-state state-${event.status}`}>{event.status === "completed" ? <Check size={13} /> : event.status === "blocked" ? <X size={13} /> : <Clock3 size={13} />}{event.status}</span><span className="text-xs text-slate-400">{formatDate(event.timestamp)}</span></div>)}</div></>;
}

function ApprovalQueue({ approvals, onApprove, onSend, onSelect }: { approvals: Approval[]; onApprove: (id: string) => void; onSend: (id: string) => void; onSelect: (approval: Approval) => void }) {
  const [filter, setFilter] = useState<"all" | ApprovalState>("all");
  const shown = approvals.filter((approval) => filter === "all" || approval.state === filter);
  return <><SectionHeading eyebrow="HUMAN GATE" title="Approval queue" description="The fleet can prepare the action. A person owns the decision." action={<div className="filter-tabs">{(["all", "pending", "approved"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>} /><div className="approval-layout"><div className="space-y-3">{shown.map((approval) => <ApprovalCard key={approval.id} approval={approval} onApprove={onApprove} onSend={onSend} onSelect={onSelect} />)}{shown.length === 0 && <div className="empty-state"><Inbox size={22} /><p>No items in this view.</p></div>}</div><div className="approval-note"><div className="note-stamp"><FileCheck2 size={17} /></div><Eyebrow>APPROVAL POLICY</Eyebrow><h3>Nothing reaches an external recipient unapproved.</h3><p>Approve records the human decision. Send is a separate operation and returns <span className="mono-label">409</span> until that decision exists.</p><div className="policy-line"><CheckCircle2 size={15} /> Human identity resolved server-side</div><div className="policy-line"><CheckCircle2 size={15} /> Draft payload remains inspectable</div><div className="policy-line"><CheckCircle2 size={15} /> Every state change is audited</div></div></div></>;
}

function ApprovalCard({ approval, onApprove, onSend, onSelect }: { approval: Approval; onApprove: (id: string) => void; onSend: (id: string) => void; onSelect: (approval: Approval) => void }) {
  return <div className={`approval-card approval-${approval.state}`}><div className="approval-accent" /><div className="flex-1 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="mono-label">{approval.actionType}</span><StatePill state={approval.state} /></div><h3 className="mt-3 text-lg font-semibold tracking-tight text-ink">{approval.summary}</h3><p className="mt-1 text-sm text-slate-500">{approval.agent} · {approval.domain} · {approval.subject}</p></div><button className="icon-button" aria-label="Inspect draft" onClick={() => onSelect(approval)}><ArrowUpRight size={17} /></button></div><div className="mt-5 flex flex-wrap items-center gap-2"><span className="eyebrow">EVIDENCE</span>{approval.evidence.map((item) => <span className="tag" key={item}>{item}</span>)}<span className="ml-auto text-xs text-slate-400">{formatDate(approval.createdAt)}</span></div><div className="mt-5 flex flex-wrap gap-2">{approval.state === "pending" && <><button className="primary-button compact" onClick={() => onApprove(approval.id)}><Check size={14} /> Approve draft</button><button className="danger-button compact" onClick={() => onSend(approval.id)}><Send size={14} /> Try send</button></>}{approval.state === "approved" && <button className="primary-button compact" onClick={() => onSend(approval.id)}><Send size={14} /> Send approved action</button>}{approval.state === "sent" && <span className="completed-copy"><CheckCircle2 size={15} /> Dispatched with audit record</span>}</div></div></div>;
}

function Audit({ entries }: { entries: AuditEntry[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => entries.filter((entry) => `${entry.tool} ${entry.detail} ${entry.outcome}`.toLowerCase().includes(query.toLowerCase())), [entries, query]);
  return <><SectionHeading eyebrow="TELEMETRY" title="Audit & trace" description="Successes and refusals carry the same operational weight." action={<div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search telemetry" /></div>} /><div className="ledger-card overflow-hidden"><div className="audit-list">{filtered.map((entry) => { const isBad = entry.outcome === "denied" || entry.outcome === "blocked"; return <div className="audit-row" key={entry.id}><div className={`audit-icon ${isBad ? "audit-bad" : entry.outcome === "approved" ? "audit-amber" : "audit-good"}`}>{isBad ? <AlertTriangle size={15} /> : entry.outcome === "approved" ? <FileCheck2 size={15} /> : <Check size={15} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-ink">{entry.tool}</span><span className={`outcome outcome-${entry.outcome}`}>{entry.outcome}</span><span className="mono-label">{entry.id}</span></div><p className="mt-1 truncate text-sm text-slate-500">{entry.detail}</p><p className="mt-1 text-xs text-slate-400">{entry.actor} · {entry.role}</p></div><span className="text-xs text-slate-400">{formatDate(entry.timestamp)}</span></div> })}</div></div></>;
}

function ApprovalDrawer({ approval, onClose, onApprove, onSend }: { approval: Approval | null; onClose: () => void; onApprove: (id: string) => void; onSend: (id: string) => void }) {
  if (!approval) return null;
  return <div className="drawer-backdrop" onClick={onClose}><aside className="approval-drawer" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-line p-6"><div><Eyebrow>APPROVAL DETAIL · {approval.id}</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{approval.summary}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close detail"><X size={18} /></button></div><div className="space-y-6 overflow-y-auto p-6"><div className="drawer-callout"><AlertTriangle size={17} /><div><p className="font-semibold text-ink">Synthetic healthcare action</p><p className="mt-1 text-sm text-slate-600">Review the evidence and destination before changing state.</p></div></div><div><Eyebrow>STATUS</Eyebrow><div className="mt-2"><StatePill state={approval.state} /></div></div><div><Eyebrow>REQUESTED BY</Eyebrow><p className="mt-2 text-sm text-ink">{approval.agent} · {approval.domain}</p><p className="mt-1 text-sm text-slate-500">{approval.subject}</p></div><div><Eyebrow>SUPPORTING EVIDENCE</Eyebrow><div className="mt-2 flex flex-wrap gap-2">{approval.evidence.map((item) => <span className="tag" key={item}>{item}</span>)}</div></div><div><Eyebrow>DRAFT PAYLOAD</Eyebrow><div className="payload-box">{Object.entries(approval.payload).map(([key, value]) => <div className="payload-line" key={key}><span>{key}</span><strong>{value}</strong></div>)}</div></div><div className="drawer-actions">{approval.state === "pending" && <><button className="primary-button w-full" onClick={() => { onApprove(approval.id); onClose(); }}><Check size={16} /> Approve draft</button><button className="danger-button w-full" onClick={() => { onSend(approval.id); onClose(); }}><Send size={16} /> Attempt send before approval</button></>}{approval.state === "approved" && <button className="primary-button w-full" onClick={() => { onSend(approval.id); onClose(); }}><Send size={16} /> Send approved action</button>}</div></div></aside></div>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [snapshot, setSnapshot] = useState<FleetSnapshot>(() => ({ ...demoSnapshot }));
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const baseUrl = import.meta.env.VITE_FLEET_API_URL || "";
  const token = import.meta.env.VITE_FLEET_TOKEN || "demo-medical-director";

  const refresh = async () => { setIsLoading(true); const data = await loadFleetSnapshot(baseUrl, token); setSnapshot(data); setLastRefresh(new Date()); setIsLoading(false); };
  useEffect(() => { refresh(); }, []);

  const mutateApproval = async (id: string, action: "approve" | "send") => {
    const target = snapshot.approvals.find((item) => item.id === id);
    if (!target) return;
    if (action === "send" && target.state === "pending") { toast.error("409 · Send refused", { description: "No human sign-off is on record. The draft remains safely held." }); return; }
    try { if (baseUrl) action === "approve" ? await approveDraft(baseUrl, token, id) : await sendDraft(baseUrl, token, id); } catch (error) { toast.error(action === "approve" ? "Approval failed" : "Send refused", { description: error instanceof Error ? error.message : "The governance API rejected this action." }); return; }
    setSnapshot((current) => ({ ...current, approvals: current.approvals.map((item) => item.id === id ? { ...item, state: action === "approve" ? "approved" : "sent", approvedBy: action === "approve" ? "Dr. HK Chun" : item.approvedBy } : item), audit: [{ id: `aud-${Date.now()}`, actor: action === "approve" ? "Dr. HK Chun" : "approval-service", role: "medical_director", tool: action, outcome: action === "approve" ? "approved" : "sent", detail: action === "approve" ? "Human sign-off recorded for synthetic action." : "Approved synthetic action dispatched.", timestamp: new Date().toISOString() }, ...current.audit] }));
    toast.success(action === "approve" ? "Draft approved" : "Action dispatched", { description: action === "approve" ? "The human decision is now recorded." : "The approved action has an audit trail." });
  };

  const onDrain = async () => { await drainEvents(baseUrl, token); toast.success("Drain requested", { description: "The outbox worker was asked to process pending events." }); await refresh(); };
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label;

  return <div className="app-shell"><div className={`mobile-scrim ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} /><aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}><div className="brand"><img src="/manus-storage/fleet-ledger-mark_8336d777.png" alt="Gemini Ops Fleet mark" /><div><p className="brand-name">GEMINI OPS</p><p className="brand-sub">Fleet / clinical ledger</p></div><button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div><div className="sidebar-section"><Eyebrow>COMMAND</Eyebrow><nav className="nav-list">{tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} className={`nav-item ${activeTab === tab.id ? "active" : ""}`} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}><Icon size={17} /><span>{tab.label}</span>{tab.id === "approvals" && snapshot.approvals.filter((a) => a.state === "pending").length > 0 && <span className="nav-count">{snapshot.approvals.filter((a) => a.state === "pending").length}</span>}</button>; })}</nav></div><div className="sidebar-bottom"><div className="sidebar-note"><div className="flex items-center gap-2 text-teal"><ShieldCheck size={16} /><span className="eyebrow text-teal">GOVERNANCE ACTIVE</span></div><p>Restrictions are enforced in code, not prompt text.</p></div><div className="operator"><div className="avatar">HK</div><div><p className="text-sm font-semibold text-ink">Dr. HK Chun</p><p className="text-xs text-slate-500">Data scientist · synthetic</p></div><ChevronRight size={15} className="ml-auto text-slate-400" /></div></div></aside><main className="main-area"><header className="topbar"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button><div><Eyebrow>OPERATIONS CONSOLE / {activeLabel?.toUpperCase()}</Eyebrow><p className="topbar-title">Healthcare agent command center</p></div><div className="topbar-actions"><div className="runtime-chip"><span className="live-pulse small" /> <span>Cloud runtime</span><span className="runtime-divider" /> <span className="mono-label">{snapshot.runtime.model}</span></div><button className="icon-button" onClick={refresh} aria-label="Refresh dashboard"><RefreshCw size={17} className={isLoading ? "spin" : ""} /></button></div></header><div className="content"><div className="content-head"><div><p className="breadcrumb">GEMINI OPS FLEET <ChevronRight size={13} /> CONTROL SURFACE</p></div><p className="last-refresh">Last refreshed {formatTime(lastRefresh.toISOString())}</p></div>{activeTab === "overview" && <Overview snapshot={snapshot} onNavigate={setActiveTab} />}{activeTab === "registry" && <Registry agents={snapshot.agents} />}{activeTab === "events" && <Events snapshot={snapshot} onDrain={onDrain} onRefresh={refresh} />}{activeTab === "approvals" && <ApprovalQueue approvals={snapshot.approvals} onApprove={(id) => mutateApproval(id, "approve")} onSend={(id) => mutateApproval(id, "send")} onSelect={setSelectedApproval} />}{activeTab === "audit" && <Audit entries={snapshot.audit} />}</div><footer className="footer"><span><HeartPulse size={14} /> Synthetic data only · governance prototype</span><span className="footer-right"><span className="live-pulse small" /> All systems reporting</span></footer></main><ApprovalDrawer approval={selectedApproval} onClose={() => setSelectedApproval(null)} onApprove={(id) => mutateApproval(id, "approve")} onSend={(id) => mutateApproval(id, "send")} /></div>;
}
