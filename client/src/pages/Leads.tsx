/* ============================================================
   Law Firm CRM — Leads Page
   Design: Dark luxury navy/gold — Playfair Display headings
   Features:
     - Kanban pipeline (New Lead / Consultation / Retained / Lost)
     - Add / Edit / Delete leads
     - Convert lead → Retained with retainer + downpayment
     - Lead Detail slide-over: all follow-ups, notes, retainer info in one panel
     - Follow-up strip on card: next due date, one-tap Done/Snooze/Reschedule
     - Overdue red border highlight
   ============================================================ */
import { useState, useMemo, useRef } from "react";
import { useCRM } from "@/contexts/CRMContext";
import {
  type Lead, type LeadStage, type CaseType, type FollowUp, type FollowUpStatus,
  formatCurrency, formatDate, getLeadTotalReceived, getLeadFollowUps
} from "@/lib/store";
import { toast } from "sonner";
import {
  Plus, ChevronDown, ChevronUp, Phone, Mail,
  Edit2, Trash2, CheckCircle, Search, Filter, Bell, Clock,
  MessageSquare, CheckCheck, AlarmClock, AlertCircle, X, FileText,
  CalendarClock, Circle, CheckCircle2, User, DollarSign
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const STAGES: LeadStage[] = ["New Lead", "Consultation", "Retained", "Lost"];
const CASE_TYPES: CaseType[] = ["DA", "SIJS", "AOS", "AO", "K1/K2", "U-Visa", "Green Card", "BIA", "Other"];

const stageColor: Record<LeadStage, string> = {
  "New Lead": "oklch(0.55 0.18 250)",
  "Consultation": "oklch(0.72 0.15 80)",
  "Retained": "oklch(0.55 0.18 145)",
  "Lost": "oklch(0.60 0.22 25)",
};

const emptyLead: Omit<Lead, "id"> = {
  name: "", phone: "", email: "", caseType: "DA", caseNumber: "", source: "",
  stage: "New Lead", notes: "", date: new Date().toISOString().split("T")[0],
  retainerBooked: 0, downpayment: 0, quotedAmount: 0, referredBy: "",
};

// ── Helpers ────────────────────────────────────────────────
function getNextFollowUp(followUps: FollowUp[]): FollowUp | null {
  const pending = followUps.filter(f => f.status === "Pending").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return pending[0] ?? null;
}

function dueDateLabel(dueDate: string): { label: string; color: string; isOverdue: boolean } {
  const today = new Date().toISOString().split("T")[0];
  const diff = new Date(dueDate + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "oklch(0.65 0.22 25)", isOverdue: true };
  if (days === 0) return { label: "Due today", color: "oklch(0.72 0.15 80)", isOverdue: false };
  if (days === 1) return { label: "Due tomorrow", color: "oklch(0.72 0.12 75)", isOverdue: false };
  return { label: `Due in ${days}d`, color: "oklch(0.55 0.01 250)", isOverdue: false };
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Main Component ─────────────────────────────────────────
export default function Leads() {
  const { data, addLead, updateLead, deleteLead, addPayment, addFollowUp, updateFollowUp, deleteFollowUp, addFollowUpComment, addLeadNote } = useCRM();
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Omit<Lead, "id">>(emptyLead);
  const [convertForm, setConvertForm] = useState({ retainerBooked: "", downpayment: "", caseNumber: "", notes: "" });
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "All">("All");

  // ── Lead Detail Slide-Over ─────────────────────────────────
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"followups" | "notes" | "info">("followups");
  // Follow-up form inside panel
  const [fuTitle, setFuTitle] = useState("Call back");
  const [fuDate, setFuDate] = useState(new Date().toISOString().split("T")[0]);
  const [showFuForm, setShowFuForm] = useState(false);
  // Note form inside panel
  const [noteText, setNoteText] = useState("");
  // Comment inputs per follow-up
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  // Inline due date editing per follow-up
  const [editingDueDateId, setEditingDueDateId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return data.leads.filter(l => {
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search) || l.caseNumber.toLowerCase().includes(search.toLowerCase());
      const matchStage = filterStage === "All" || l.stage === filterStage;
      return matchSearch && matchStage;
    });
  }, [data.leads, search, filterStage]);

  const byStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = { "New Lead": [], "Consultation": [], "Retained": [], "Lost": [] };
    filtered.forEach(l => map[l.stage].push(l));
    return map;
  }, [filtered]);

  const detailLead = useMemo(() =>
    detailLeadId ? data.leads.find(l => l.id === detailLeadId) ?? null : null,
    [detailLeadId, data.leads]
  );
  const detailFollowUps = useMemo(() =>
    detailLead ? getLeadFollowUps(data, detailLead.id).sort((a, b) => {
      if (a.status === "Done" && b.status !== "Done") return 1;
      if (b.status === "Done" && a.status !== "Done") return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }) : [],
    [detailLead, data]
  );
  const detailPayments = useMemo(() =>
    detailLead ? data.payments.filter(p => p.leadId === detailLead.id) : [],
    [detailLead, data.payments]
  );

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (editLead) {
      updateLead(editLead.id, form);
      toast.success("Lead updated");
      setEditLead(null);
    } else {
      addLead(form);
      toast.success("Lead added");
      setShowAdd(false);
    }
    setForm(emptyLead);
  };

  const handleConvert = () => {
    if (!convertLead) return;
    const retainer = parseFloat(convertForm.retainerBooked) || 0;
    const dp = parseFloat(convertForm.downpayment) || 0;
    if (retainer <= 0) { toast.error("Enter retainer amount"); return; }
    updateLead(convertLead.id, {
      stage: "Retained",
      retainerBooked: retainer,
      downpayment: dp,
      caseNumber: convertForm.caseNumber || convertLead.caseNumber,
      convertedDate: new Date().toISOString().split("T")[0],
    });
    if (dp > 0) {
      addPayment({
        date: new Date().toISOString().split("T")[0],
        clientName: convertLead.name,
        leadId: convertLead.id,
        caseType: convertLead.caseType,
        caseNumber: convertForm.caseNumber || convertLead.caseNumber,
        paymentType: "New Client",
        amount: dp,
        receivedFor: "Retainer downpayment",
        notes: convertForm.notes,
      });
    }
    toast.success(`${convertLead.name} converted to Retained`);
    setConvertLead(null);
    setConvertForm({ retainerBooked: "", downpayment: "", caseNumber: "", notes: "" });
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    const { id, ...rest } = lead;
    setForm(rest);
    setShowAdd(true);
  };

  const openDetail = (lead: Lead) => {
    setDetailLeadId(lead.id);
    setDetailTab("followups");
    setShowFuForm(false);
    setFuTitle("Call back");
    setFuDate(new Date().toISOString().split("T")[0]);
    setNoteText("");
    setCommentText({});
    setEditingDueDateId(null);
  };

  const handleSaveFollowUp = () => {
    if (!detailLeadId) return;
    if (!fuTitle.trim()) { toast.error("Enter a task title"); return; }
    if (!fuDate) { toast.error("Select a due date"); return; }
    addFollowUp({ leadId: detailLeadId, dueDate: fuDate, status: "Pending", title: fuTitle.trim() });
    setFuTitle("Call back");
    setFuDate(new Date().toISOString().split("T")[0]);
    setShowFuForm(false);
    toast.success("Follow-up added");
  };

  const handleSaveNote = () => {
    if (!detailLeadId || !noteText.trim()) return;
    addLeadNote(detailLeadId, noteText.trim());
    setNoteText("");
    toast.success("Note saved");
  };

  const handleAddComment = (fuId: string) => {
    const text = (commentText[fuId] || "").trim();
    if (!text) return;
    addFollowUpComment(fuId, "", text);
    setCommentText(prev => ({ ...prev, [fuId]: "" }));
    toast.success("Comment added");
  };

  const handleStatusCycle = (fu: FollowUp) => {
    const next: Record<FollowUpStatus, FollowUpStatus> = { Pending: "Done", Done: "Snoozed", Snoozed: "Pending" };
    updateFollowUp(fu.id, { status: next[fu.status] });
  };

  const handleMarkDone = (fu: FollowUp) => { updateFollowUp(fu.id, { status: "Done" }); toast.success("Marked as done"); };
  const handleSnooze = (fu: FollowUp) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    updateFollowUp(fu.id, { status: "Pending", dueDate: tomorrow.toISOString().split("T")[0] });
    toast.success("Snoozed to tomorrow");
  };
  const handleReschedule = (fu: FollowUp, newDate: string) => {
    updateFollowUp(fu.id, { dueDate: newDate });
    toast.success("Due date updated");
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
            Leads Pipeline
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
            {data.leads.length} total · {data.leads.filter(l => l.stage === "Retained").length} retained
          </p>
        </div>
        <Button onClick={() => { setEditLead(null); setForm(emptyLead); setShowAdd(true); }}
          style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>
          <Plus className="w-4 h-4 mr-2" /> Add Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.55 0.01 250)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
            className="pl-9" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
        </div>
        <Select value={filterStage} onValueChange={v => setFilterStage(v as LeadStage | "All")}>
          <SelectTrigger className="w-40" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
            <Filter className="w-3.5 h-3.5 mr-2" style={{ color: "oklch(0.55 0.01 250)" }} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
            <SelectItem value="All">All Stages</SelectItem>
            {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAGES.map(stage => (
          <div key={stage} className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.16 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "oklch(1 0 0 / 8%)", borderLeft: `3px solid ${stageColor[stage]}` }}>
              <span className="text-sm font-semibold" style={{ color: "oklch(0.80 0.005 250)" }}>{stage}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${stageColor[stage]}20`, color: stageColor[stage] }}>
                {byStage[stage].length}
              </span>
            </div>
            <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
              {byStage[stage].length === 0 && (
                <div className="text-center py-8 text-xs" style={{ color: "oklch(0.40 0.01 250)" }}>No leads</div>
              )}
              {byStage[stage].map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  data={data}
                  onOpenDetail={() => openDetail(lead)}
                  onEdit={() => openEdit(lead)}
                  onDelete={() => { deleteLead(lead.id); toast.success("Lead deleted"); }}
                  onConvert={() => setConvertLead(lead)}
                  onMarkDone={handleMarkDone}
                  onSnooze={handleSnooze}
                  onReschedule={handleReschedule}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Lead Detail Slide-Over ──────────────────────────── */}
      {detailLead && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setDetailLeadId(null)}
          />
          {/* Panel */}
          <div
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col shadow-2xl"
            style={{
              width: "min(480px, 100vw)",
              background: "oklch(0.15 0.025 250)",
              borderLeft: "1px solid oklch(0.72 0.12 75 / 25%)",
            }}
          >
            {/* Panel Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold truncate" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
                    {detailLead.name}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0" style={{ background: `${stageColor[detailLead.stage]}20`, color: stageColor[detailLead.stage] }}>
                    {detailLead.stage}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{detailLead.caseType}</span>
                  {detailLead.caseNumber && <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>#{detailLead.caseNumber}</span>}
                  {detailLead.phone && (
                    <a href={`tel:${detailLead.phone}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "oklch(0.65 0.01 250)" }}>
                      <Phone className="w-3 h-3" />{detailLead.phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(detailLead)} className="p-1.5 rounded hover:bg-white/8 transition-colors" title="Edit lead" style={{ color: "oklch(0.72 0.12 75)" }}>
                  <Edit2 className="w-4 h-4" />
                </button>
                {detailLead.stage !== "Retained" && detailLead.stage !== "Lost" && (
                  <button onClick={() => setConvertLead(detailLead)} className="flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors" style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}>
                    <CheckCircle className="w-3 h-3" /> Convert
                  </button>
                )}
                <button onClick={() => setDetailLeadId(null)} className="p-1.5 rounded hover:bg-white/8 transition-colors" style={{ color: "oklch(0.55 0.01 250)" }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Retainer bar (if retained) */}
            {detailLead.stage === "Retained" && detailLead.retainerBooked > 0 && (() => {
              const rcvd = detailPayments.reduce((s, p) => s + p.amount, 0);
              const pct = Math.min(100, (rcvd / detailLead.retainerBooked) * 100);
              const outstanding = detailLead.retainerBooked - rcvd;
              return (
                <div className="px-5 py-3 border-b flex-shrink-0" style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.17 0.025 250)" }}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: "oklch(0.55 0.01 250)" }}>Retainer: <strong style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(detailLead.retainerBooked)}</strong></span>
                    <span style={{ color: "oklch(0.55 0.01 250)" }}>Rcvd: <strong style={{ color: "oklch(0.65 0.18 145)" }}>{formatCurrency(rcvd)}</strong></span>
                    <span style={{ color: "oklch(0.55 0.01 250)" }}>
                      {outstanding <= 0
                        ? <strong style={{ color: "oklch(0.65 0.18 145)" }}>PAID ✓</strong>
                        : <strong style={{ color: "oklch(0.70 0.22 25)" }}>Owed: {formatCurrency(outstanding)}</strong>
                      }
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: outstanding <= 0 ? "oklch(0.55 0.18 145)" : "oklch(0.72 0.12 75)" }} />
                  </div>
                </div>
              );
            })()}

            {/* Tab bar */}
            <div className="flex border-b flex-shrink-0" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
              {([
                { id: "followups", label: "Follow-Ups", icon: Bell, count: detailFollowUps.filter(f => f.status === "Pending").length },
                { id: "notes", label: "Notes", icon: MessageSquare, count: (detailLead.leadLog || []).length },
                { id: "info", label: "Info", icon: FileText, count: 0 },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all border-b-2"
                  style={{
                    borderBottomColor: detailTab === tab.id ? "oklch(0.72 0.12 75)" : "transparent",
                    color: detailTab === tab.id ? "oklch(0.72 0.12 75)" : "oklch(0.50 0.01 250)",
                    background: detailTab === tab.id ? "oklch(0.72 0.12 75 / 5%)" : "transparent",
                  }}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="text-xs px-1.5 py-0 rounded-full font-bold" style={{
                      background: tab.id === "followups" && detailFollowUps.some(f => f.status === "Pending" && f.dueDate <= today)
                        ? "oklch(0.65 0.22 25)"
                        : "oklch(0.72 0.12 75 / 25%)",
                      color: tab.id === "followups" && detailFollowUps.some(f => f.status === "Pending" && f.dueDate <= today)
                        ? "oklch(0.98 0 0)"
                        : "oklch(0.72 0.12 75)",
                      lineHeight: "16px",
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Follow-Ups Tab ── */}
              {detailTab === "followups" && (
                <div className="p-4 space-y-3">
                  {/* Add follow-up button / form */}
                  {!showFuForm ? (
                    <button
                      onClick={() => setShowFuForm(true)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed text-sm font-medium transition-all hover:border-solid hover:bg-white/5"
                      style={{ borderColor: "oklch(0.72 0.12 75 / 40%)", color: "oklch(0.72 0.12 75)" }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Follow-Up Task
                    </button>
                  ) : (
                    <div className="rounded-lg border p-3 space-y-2" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 35%)" }}>
                      <input
                        type="text"
                        value={fuTitle}
                        onChange={e => setFuTitle(e.target.value)}
                        placeholder="Task title (e.g. Call back)"
                        autoFocus
                        className="w-full px-3 py-2 rounded text-sm outline-none"
                        style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: "oklch(0.90 0.005 250)" }}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveFollowUp(); if (e.key === "Escape") setShowFuForm(false); }}
                      />
                      <div className="flex gap-2 items-center">
                        <div className="flex items-center gap-1.5 flex-1">
                          <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.55 0.01 250)" }} />
                          <input
                            type="date"
                            value={fuDate}
                            onChange={e => setFuDate(e.target.value)}
                            className="flex-1 px-2 py-1.5 rounded text-xs outline-none"
                            style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: "oklch(0.90 0.005 250)", colorScheme: "dark" }}
                          />
                        </div>
                        <button onClick={handleSaveFollowUp} className="px-3 py-1.5 rounded text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>
                          Add
                        </button>
                        <button onClick={() => setShowFuForm(false)} className="p-1.5 rounded hover:bg-white/8" style={{ color: "oklch(0.50 0.01 250)" }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Follow-up list */}
                  {detailFollowUps.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.30 0.01 250)" }} />
                      <p className="text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>No follow-ups yet.</p>
                      <p className="text-xs mt-1" style={{ color: "oklch(0.35 0.01 250)" }}>Click "Add Follow-Up Task" above.</p>
                    </div>
                  ) : (
                    detailFollowUps.map(fu => {
                      const dueInfo = dueDateLabel(fu.dueDate);
                      const isOverdue = fu.status === "Pending" && fu.dueDate < today;
                      const isDueToday = fu.status === "Pending" && fu.dueDate === today;
                      const myComment = commentText[fu.id] || "";

                      return (
                        <div
                          key={fu.id}
                          className="rounded-lg border overflow-hidden"
                          style={{
                            background: "oklch(0.18 0.025 250)",
                            borderColor: isOverdue ? "oklch(0.60 0.22 25 / 40%)" : isDueToday ? "oklch(0.72 0.12 75 / 30%)" : "oklch(1 0 0 / 8%)",
                            borderLeftWidth: "3px",
                            borderLeftColor: isOverdue ? "oklch(0.65 0.22 25)" : isDueToday ? "oklch(0.72 0.12 75)" : fu.status === "Done" ? "oklch(0.55 0.18 145)" : "oklch(0.55 0.01 250 / 30%)",
                          }}
                        >
                          {/* Task row */}
                          <div className="flex items-start gap-2.5 p-3">
                            {/* Status circle */}
                            <button
                              onClick={() => handleStatusCycle(fu)}
                              className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                              title={`${fu.status} — click to cycle`}
                            >
                              {fu.status === "Done"
                                ? <CheckCircle2 className="w-4.5 h-4.5" style={{ color: "oklch(0.70 0.18 145)", width: "18px", height: "18px" }} />
                                : fu.status === "Snoozed"
                                ? <Clock className="w-4.5 h-4.5" style={{ color: "oklch(0.65 0.01 250)", width: "18px", height: "18px" }} />
                                : <Circle className="w-4.5 h-4.5" style={{ color: "oklch(0.72 0.12 75)", width: "18px", height: "18px" }} />
                              }
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium" style={{
                                  color: fu.status === "Done" ? "oklch(0.45 0.01 250)" : "oklch(0.90 0.005 250)",
                                  textDecoration: fu.status === "Done" ? "line-through" : "none",
                                }}>
                                  {fu.title}
                                </span>
                                {isOverdue && <span className="text-xs font-bold px-1.5 py-0 rounded" style={{ background: "oklch(0.65 0.22 25 / 15%)", color: "oklch(0.70 0.22 25)" }}>OVERDUE</span>}
                                {isDueToday && <span className="text-xs font-bold px-1.5 py-0 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>TODAY</span>}
                              </div>

                              {/* Due date — clickable to reschedule */}
                              <div className="flex items-center gap-2 mt-1">
                                <CalendarClock className="w-3 h-3 flex-shrink-0" style={{ color: "oklch(0.45 0.01 250)" }} />
                                {editingDueDateId === fu.id ? (
                                  <input
                                    type="date"
                                    defaultValue={fu.dueDate}
                                    autoFocus
                                    className="text-xs px-1.5 py-0.5 rounded outline-none"
                                    style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 60%)", color: "oklch(0.90 0.005 250)", colorScheme: "dark" }}
                                    onChange={e => { if (e.target.value) { handleReschedule(fu, e.target.value); setEditingDueDateId(null); } }}
                                    onBlur={() => setEditingDueDateId(null)}
                                    onKeyDown={e => { if (e.key === "Escape") setEditingDueDateId(null); }}
                                  />
                                ) : (
                                  <button
                                    className="text-xs flex items-center gap-1 px-1 py-0.5 rounded hover:bg-white/8 group transition-colors"
                                    style={{ color: dueInfo.color }}
                                    onClick={() => setEditingDueDateId(fu.id)}
                                    title="Click to change due date"
                                  >
                                    {formatDate(fu.dueDate)} · {dueInfo.label}
                                    <span className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ fontSize: "10px" }}>✎</span>
                                  </button>
                                )}
                              </div>

                              {/* Comments */}
                              {fu.comments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {fu.comments.map(c => (
                                    <div key={c.id} className="text-xs px-2 py-1 rounded" style={{ background: "oklch(0.20 0.025 250)", borderLeft: "2px solid oklch(0.72 0.12 75 / 30%)" }}>
                                      <span style={{ color: "oklch(0.80 0.005 250)" }}>{c.text}</span>
                                      <span className="ml-2" style={{ color: "oklch(0.38 0.01 250)" }}>{formatTimestamp(c.timestamp)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add comment input */}
                              <div className="flex gap-1.5 mt-2">
                                <input
                                  type="text"
                                  placeholder="Add a note (e.g. M: called, no answer)"
                                  value={myComment}
                                  onChange={e => setCommentText(prev => ({ ...prev, [fu.id]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === "Enter" && myComment.trim()) handleAddComment(fu.id); }}
                                  className="flex-1 px-2 py-1 rounded text-xs outline-none"
                                  style={{ background: "oklch(0.20 0.025 250)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.85 0.005 250)" }}
                                />
                                {myComment.trim() && (
                                  <button onClick={() => handleAddComment(fu.id)} className="px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-90" style={{ background: "oklch(0.72 0.12 75 / 20%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}>
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Quick actions */}
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              {fu.status !== "Done" && (
                                <button onClick={() => handleMarkDone(fu)} title="Mark done" className="p-1 rounded hover:bg-white/8 transition-colors" style={{ color: "oklch(0.55 0.18 145)" }}>
                                  <CheckCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {fu.status === "Pending" && (
                                <button onClick={() => handleSnooze(fu)} title="Snooze to tomorrow" className="p-1 rounded hover:bg-white/8 transition-colors" style={{ color: "oklch(0.65 0.12 250)" }}>
                                  <AlarmClock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => { deleteFollowUp(fu.id); toast.success("Task deleted"); }} title="Delete task" className="p-1 rounded hover:bg-red-500/15 transition-colors" style={{ color: "oklch(0.55 0.01 250)" }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── Notes Tab ── */}
              {detailTab === "notes" && (
                <div className="p-4 space-y-3">
                  {/* Add note */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="e.g. M: called, no answer — left voicemail"
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "oklch(0.20 0.025 250)", border: "1px solid oklch(0.55 0.18 250 / 30%)", color: "oklch(0.90 0.005 250)" }}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveNote(); }}
                    />
                    <button onClick={handleSaveNote} className="px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: "oklch(0.55 0.18 250)", color: "oklch(0.98 0 0)" }}>
                      Save
                    </button>
                  </div>

                  {/* Notes list */}
                  {(detailLead.leadLog || []).length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.30 0.01 250)" }} />
                      <p className="text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>No notes yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...(detailLead.leadLog || [])].reverse().map(n => (
                        <div key={n.id} className="px-3 py-2.5 rounded-lg text-sm" style={{ background: "oklch(0.18 0.025 250)", borderLeft: "2px solid oklch(0.55 0.18 250 / 50%)" }}>
                          <div className="text-xs mb-1" style={{ color: "oklch(0.40 0.01 250)" }}>
                            {formatTimestamp(n.timestamp)}
                          </div>
                          <div style={{ color: "oklch(0.82 0.005 250)" }}>{n.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Info Tab ── */}
              {detailTab === "info" && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Case Type", value: detailLead.caseType },
                      { label: "Case Number", value: detailLead.caseNumber || "—" },
                      { label: "Date Added", value: formatDate(detailLead.date) },
                      { label: "Stage", value: detailLead.stage },
                      { label: "Source", value: detailLead.source || "—" },
                      { label: "Referred By", value: detailLead.referredBy || "—" },
                      { label: "Quoted", value: detailLead.quotedAmount > 0 ? formatCurrency(detailLead.quotedAmount) : "—" },
                      { label: "Email", value: detailLead.email || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg p-3" style={{ background: "oklch(0.18 0.025 250)" }}>
                        <div className="text-xs mb-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>{label}</div>
                        <div className="text-sm font-medium" style={{ color: "oklch(0.82 0.005 250)" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {detailLead.notes && (
                    <div className="rounded-lg p-3" style={{ background: "oklch(0.18 0.025 250)" }}>
                      <div className="text-xs mb-1" style={{ color: "oklch(0.45 0.01 250)" }}>Notes</div>
                      <div className="text-sm leading-relaxed" style={{ color: "oklch(0.75 0.01 250)" }}>{detailLead.notes}</div>
                    </div>
                  )}
                  {/* Payment history */}
                  {detailPayments.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.45 0.01 250)" }}>Payment History</div>
                      <div className="space-y-1.5">
                        {detailPayments.sort((a, b) => b.date.localeCompare(a.date)).map(p => (
                          <div key={p.id} className="flex items-center justify-between text-xs px-3 py-2 rounded" style={{ background: "oklch(0.18 0.025 250)" }}>
                            <div>
                              <span style={{ color: "oklch(0.65 0.01 250)" }}>{formatDate(p.date)}</span>
                              <span className="ml-2" style={{ color: "oklch(0.75 0.01 250)" }}>{p.receivedFor}</span>
                            </div>
                            <span className="font-bold" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Add/Edit Lead Modal ─────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={open => { if (!open) { setShowAdd(false); setEditLead(null); setForm(emptyLead); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
              {editLead ? "Edit Lead" : "Add New Lead"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Client Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (xxx) xxx-xxxx"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Case Type</Label>
              <Select value={form.caseType} onValueChange={v => setForm(f => ({ ...f, caseType: v as CaseType }))}>
                <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                  {CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Case Number</Label>
              <Input value={form.caseNumber} onChange={e => setForm(f => ({ ...f, caseNumber: e.target.value }))} placeholder="e.g. 409"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Lead Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Stage</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as LeadStage }))}>
                <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                  {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Source</Label>
              <Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Referral, Google"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Referred By</Label>
              <Input value={form.referredBy} onChange={e => setForm(f => ({ ...f, referredBy: e.target.value }))} placeholder="Name"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Quoted Amount</Label>
              <Input type="number" value={form.quotedAmount || ""} onChange={e => setForm(f => ({ ...f, quotedAmount: parseFloat(e.target.value) || 0 }))} placeholder="0"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..."
                rows={3} style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleSave} style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>
              {editLead ? "Save Changes" : "Add Lead"}
            </Button>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditLead(null); setForm(emptyLead); }}
              style={{ borderColor: "oklch(1 0 0 / 20%)", color: "oklch(0.65 0.01 250)" }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Convert Lead Modal ──────────────────────────────── */}
      <Dialog open={!!convertLead} onOpenChange={open => { if (!open) setConvertLead(null); }}>
        <DialogContent style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
              Convert {convertLead?.name} to Retained
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Total Retainer Amount *</Label>
              <Input type="number" value={convertForm.retainerBooked} onChange={e => setConvertForm(f => ({ ...f, retainerBooked: e.target.value }))} placeholder="e.g. 9000"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Downpayment Received Today</Label>
              <Input type="number" value={convertForm.downpayment} onChange={e => setConvertForm(f => ({ ...f, downpayment: e.target.value }))} placeholder="e.g. 2500"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Case Number</Label>
              <Input value={convertForm.caseNumber} onChange={e => setConvertForm(f => ({ ...f, caseNumber: e.target.value }))} placeholder={convertLead?.caseNumber || "e.g. 512"}
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Notes</Label>
              <Textarea value={convertForm.notes} onChange={e => setConvertForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..."
                rows={2} style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleConvert} style={{ background: "oklch(0.55 0.18 145)", color: "oklch(0.98 0 0)" }}>
              <CheckCircle className="w-4 h-4 mr-2" /> Confirm Conversion
            </Button>
            <Button variant="outline" onClick={() => setConvertLead(null)}
              style={{ borderColor: "oklch(1 0 0 / 20%)", color: "oklch(0.65 0.01 250)" }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── LeadCard Component (compact — click name to open detail panel) ──
function LeadCard({
  lead, data, onOpenDetail, onEdit, onDelete, onConvert, onMarkDone, onSnooze, onReschedule,
}: {
  lead: Lead;
  data: any;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
  onMarkDone: (fu: FollowUp) => void;
  onSnooze: (fu: FollowUp) => void;
  onReschedule: (fu: FollowUp, newDate: string) => void;
}) {
  const [editingDueDate, setEditingDueDate] = useState(false);
  const totalReceived = getLeadTotalReceived(data, lead.id);
  const outstanding = lead.retainerBooked > 0 ? lead.retainerBooked - totalReceived : 0;
  const pct = lead.retainerBooked > 0 ? Math.min(100, (totalReceived / lead.retainerBooked) * 100) : 0;
  const paidFull = lead.retainerBooked > 0 && totalReceived >= lead.retainerBooked;
  const leadFollowUps = getLeadFollowUps(data, lead.id);
  const nextFU = getNextFollowUp(leadFollowUps);
  const pendingCount = leadFollowUps.filter(f => f.status === "Pending").length;
  const dueInfo = nextFU ? dueDateLabel(nextFU.dueDate) : null;
  const isOverdue = dueInfo?.isOverdue ?? false;

  return (
    <div
      className="rounded-lg border p-3 transition-all"
      style={{
        background: "oklch(0.19 0.025 250)",
        borderColor: isOverdue ? "oklch(0.60 0.22 25 / 60%)" : "oklch(1 0 0 / 8%)",
        borderLeftWidth: "3px",
        borderLeftColor: isOverdue ? "oklch(0.65 0.22 25)" : "oklch(1 0 0 / 8%)",
      }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Clickable name opens detail panel */}
            <button
              onClick={onOpenDetail}
              className="font-medium text-sm hover:underline text-left transition-colors"
              style={{ color: "oklch(0.93 0.005 250)" }}
              title="Open lead detail"
            >
              {lead.name}
            </button>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "oklch(0.65 0.01 250)" }} onClick={e => e.stopPropagation()}>
                <Phone className="w-3 h-3" />{lead.phone}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{lead.caseType}</span>
            {lead.caseNumber && <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>#{lead.caseNumber}</span>}
            <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{formatDate(lead.date)}</span>
          </div>
        </div>
        {/* Open detail panel button */}
        <button
          onClick={onOpenDetail}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:bg-white/8 relative flex-shrink-0"
          style={{ color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 25%)" }}
          title="Open detail panel"
        >
          <Bell className="w-3 h-3" />
          {pendingCount > 0 && (
            <span className="font-bold" style={{ fontSize: "10px" }}>{pendingCount}</span>
          )}
        </button>
      </div>

      {/* ── Next Follow-Up Strip ── */}
      {nextFU && (
        <div
          className="mt-2 px-2 py-1.5 rounded flex items-center justify-between gap-2"
          style={{
            background: isOverdue ? "oklch(0.60 0.22 25 / 10%)" : "oklch(0.22 0.025 250)",
            border: `1px solid ${isOverdue ? "oklch(0.60 0.22 25 / 30%)" : "oklch(1 0 0 / 8%)"}`,
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isOverdue
              ? <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: "oklch(0.65 0.22 25)" }} />
              : <Clock className="w-3 h-3 flex-shrink-0" style={{ color: dueInfo!.color }} />
            }
            <span className="text-xs truncate" style={{ color: "oklch(0.80 0.005 250)" }}>{nextFU.title}</span>
            {editingDueDate ? (
              <input
                type="date"
                defaultValue={nextFU.dueDate}
                autoFocus
                className="text-xs px-1 py-0.5 rounded outline-none flex-shrink-0"
                style={{ background: "oklch(0.26 0.03 250)", border: "1px solid oklch(0.72 0.12 75 / 60%)", color: "oklch(0.90 0.005 250)", colorScheme: "dark", maxWidth: "120px" }}
                onChange={e => { if (e.target.value) { onReschedule(nextFU, e.target.value); setEditingDueDate(false); } }}
                onBlur={() => setEditingDueDate(false)}
                onKeyDown={e => { if (e.key === "Escape") setEditingDueDate(false); }}
              />
            ) : (
              <button
                className="text-xs flex-shrink-0 font-medium flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-white/10 group transition-colors"
                style={{ color: dueInfo!.color }}
                onClick={() => setEditingDueDate(true)}
                title="Click to change due date"
              >
                {dueInfo!.label}
                <span className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ fontSize: "9px" }}>✎</span>
              </button>
            )}
          </div>
          {/* One-tap Done / Snooze */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onMarkDone(nextFU)}
              className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded transition-colors hover:opacity-90"
              style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}
              title="Mark done"
            >
              <CheckCheck className="w-3 h-3" />
            </button>
            <button
              onClick={() => onSnooze(nextFU)}
              className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded transition-colors hover:opacity-90"
              style={{ background: "oklch(0.55 0.18 250 / 20%)", color: "oklch(0.65 0.12 250)", border: "1px solid oklch(0.55 0.18 250 / 30%)" }}
              title="Snooze to tomorrow"
            >
              <AlarmClock className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Retainer progress (Retained only) */}
      {lead.stage === "Retained" && lead.retainerBooked > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1" style={{ color: "oklch(0.55 0.01 250)" }}>
            <span>Booked: {formatCurrency(lead.retainerBooked)}</span>
            <span>Rcvd: {formatCurrency(totalReceived)}</span>
            <span>Due: {formatCurrency(outstanding)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: paidFull ? "oklch(0.55 0.18 145)" : "oklch(0.72 0.12 75)" }} />
          </div>
          {paidFull && <div className="text-xs mt-1 font-semibold" style={{ color: "oklch(0.55 0.18 145)" }}>PAID IN FULL ✓</div>}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 mt-2.5">
        {lead.stage !== "Retained" && lead.stage !== "Lost" && (
          <button onClick={onConvert} className="flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors"
            style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}>
            <CheckCircle className="w-3 h-3" /> Convert
          </button>
        )}
        <button onClick={onEdit} className="p-1.5 rounded transition-colors hover:bg-white/8" title="Edit lead" style={{ color: "oklch(0.72 0.12 75)" }}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded transition-colors hover:bg-red-500/10" title="Delete lead" style={{ color: "oklch(0.65 0.18 25)" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
