/* ============================================================
   LeadDetailPanel — shared slide-over component
   Design: Dark luxury navy/gold — Playfair Display headings
   Used by: Leads page, FollowUps page
   Opens as a right-side fixed panel over any page.
   Self-contained: calls useCRM() directly.
   ============================================================ */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useCRM } from "@/contexts/CRMContext";
import {
  type Lead, type FollowUp, type FollowUpStatus,
  formatCurrency, formatDate, getLeadTotalReceived, getLeadFollowUps,
} from "@/lib/store";
import { toast } from "sonner";
import {
  Bell, MessageSquare, FileText, X, Plus, CalendarClock,
  Phone, Edit2, CheckCircle, CheckCircle2, Circle, Clock,
  CheckCheck, AlarmClock, Trash2, CreditCard, Check,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────
const stageColor: Record<string, string> = {
  "New Lead": "oklch(0.55 0.18 250)",
  "Consultation": "oklch(0.72 0.15 80)",
  "Retained": "oklch(0.55 0.18 145)",
  "Lost": "oklch(0.60 0.22 25)",
};

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

// ── Props ──────────────────────────────────────────────────
interface LeadDetailPanelProps {
  leadId: string | null;
  onClose: () => void;
  /** Optional: open the edit-lead dialog for this lead */
  onEditLead?: (lead: Lead) => void;
  /** Optional: open the convert-to-retained dialog */
  onConvertLead?: (lead: Lead) => void;
  /** Initial tab to show when opening */
  initialTab?: "followups" | "notes" | "info" | "installments";
}

export default function LeadDetailPanel({
  leadId,
  onClose,
  onEditLead,
  onConvertLead,
  initialTab = "followups",
}: LeadDetailPanelProps) {
  const { leads, payments, followUps: allFollowUps, addFollowUp, updateFollowUp, deleteFollowUp, addFollowUpComment, addLeadNote } = useCRM();

  const utils = trpc.useUtils();

  const [detailTab, setDetailTab] = useState<"followups" | "notes" | "info" | "installments">(initialTab);
  const [fuTitle, setFuTitle] = useState("Call back");
  const [fuDate, setFuDate] = useState(new Date().toISOString().split("T")[0]);
  const [showFuForm, setShowFuForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [editingDueDateId, setEditingDueDateId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const lead = useMemo(() =>
    leadId ? leads.find(l => l.id === leadId) ?? null : null,
    [leadId, leads]
  );

  const leadFollowUps = useMemo(() =>
    lead ? allFollowUps.filter(f => f.leadId === lead.id).sort((a, b) => {
      if (a.status === "Done" && b.status !== "Done") return 1;
      if (b.status === "Done" && a.status !== "Done") return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }) : [],
    [lead, allFollowUps]
  );

  const leadPayments = useMemo(() =>
    lead ? payments.filter(p => p.leadId === lead.id) : [],
    [lead, payments]
  );

  // ── Notes from DB ──────────────────────────────────────────
  const { data: dbNotes = [], isLoading: notesLoading } = trpc.leads.getNotes.useQuery(
    { leadId: lead?.id ?? "" },
    { enabled: !!lead?.id }
  );
  const [isSavingNote, setIsSavingNote] = useState(false);

  if (!lead) return null;

  const handleSaveFollowUp = () => {
    if (!fuTitle.trim()) { toast.error("Enter a task title"); return; }
    if (!fuDate) { toast.error("Select a due date"); return; }
    addFollowUp({ leadId: lead.id, dueDate: fuDate, status: "Pending", title: fuTitle.trim() });
    setFuTitle("Call back");
    setFuDate(new Date().toISOString().split("T")[0]);
    setShowFuForm(false);
    toast.success("Follow-up added");
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || isSavingNote) return;
    setIsSavingNote(true);
    try {
      await addLeadNote(lead.id, noteText.trim());
      await utils.leads.getNotes.invalidate({ leadId: lead.id });
      setNoteText("");
      toast.success("Note saved");
    } finally {
      setIsSavingNote(false);
    }
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

  const handleMarkDone = (fu: FollowUp) => {
    updateFollowUp(fu.id, { status: "Done" });
    toast.success("Marked as done");
  };

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

  const totalReceived = leadPayments.reduce((s, p) => s + p.amount, 0);
  const pendingCount = leadFollowUps.filter(f => f.status === "Pending").length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
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
                {lead.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0"
                style={{ background: `${stageColor[lead.stage] ?? "oklch(0.55 0.01 250)"}20`, color: stageColor[lead.stage] ?? "oklch(0.55 0.01 250)" }}>
                {lead.stage}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>
                {lead.caseType}
              </span>
              {lead.caseNumber && <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>#{lead.caseNumber}</span>}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "oklch(0.65 0.01 250)" }}>
                  <Phone className="w-3 h-3" />{lead.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEditLead && (
              <button onClick={() => onEditLead(lead)} className="p-1.5 rounded hover:bg-white/8 transition-colors" title="Edit lead" style={{ color: "oklch(0.72 0.12 75)" }}>
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onConvertLead && lead.stage !== "Retained" && lead.stage !== "Lost" && (
              <button onClick={() => onConvertLead(lead)} className="flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors"
                style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}>
                <CheckCircle className="w-3 h-3" /> Convert
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-white/8 transition-colors" style={{ color: "oklch(0.55 0.01 250)" }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Retainer bar (Retained leads only) */}
        {lead.stage === "Retained" && lead.retainerBooked > 0 && (() => {
          const pct = Math.min(100, (totalReceived / lead.retainerBooked) * 100);
          const outstanding = lead.retainerBooked - totalReceived;
          return (
            <div className="px-5 py-3 border-b flex-shrink-0" style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.17 0.025 250)" }}>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: "oklch(0.55 0.01 250)" }}>Retainer: <strong style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(lead.retainerBooked)}</strong></span>
                <span style={{ color: "oklch(0.55 0.01 250)" }}>Rcvd: <strong style={{ color: "oklch(0.65 0.18 145)" }}>{formatCurrency(totalReceived)}</strong></span>
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
            { id: "followups" as const, label: "Follow-Ups", icon: Bell, count: pendingCount },
            { id: "notes" as const, label: "Notes", icon: MessageSquare, count: dbNotes.length },
            { id: "info" as const, label: "Info", icon: FileText, count: 0 },
            { id: "installments" as const, label: "Payments", icon: CreditCard, count: 0 },
          ]).map(tab => (
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
                  background: tab.id === "followups" && leadFollowUps.some(f => f.status === "Pending" && f.dueDate <= today)
                    ? "oklch(0.65 0.22 25)"
                    : "oklch(0.72 0.12 75 / 25%)",
                  color: tab.id === "followups" && leadFollowUps.some(f => f.status === "Pending" && f.dueDate <= today)
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
              {/* Add follow-up button / inline form */}
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
              {leadFollowUps.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.30 0.01 250)" }} />
                  <p className="text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>No follow-ups yet.</p>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.35 0.01 250)" }}>Click "Add Follow-Up Task" above.</p>
                </div>
              ) : (
                leadFollowUps.map(fu => {
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
                      <div className="flex items-start gap-2.5 p-3">
                        {/* Status circle — click to cycle */}
                        <button
                          onClick={() => handleStatusCycle(fu)}
                          className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                          title={`${fu.status} — click to cycle`}
                        >
                          {fu.status === "Done"
                            ? <CheckCircle2 style={{ color: "oklch(0.70 0.18 145)", width: "18px", height: "18px" }} />
                            : fu.status === "Snoozed"
                            ? <Clock style={{ color: "oklch(0.65 0.01 250)", width: "18px", height: "18px" }} />
                            : <Circle style={{ color: "oklch(0.72 0.12 75)", width: "18px", height: "18px" }} />
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

                          {/* Due date — click to reschedule inline */}
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

                          {/* Add comment */}
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
                              <button onClick={() => handleAddComment(fu.id)} className="px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-90"
                                style={{ background: "oklch(0.72 0.12 75 / 20%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}>
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
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="px-3 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "oklch(0.55 0.18 250)", color: "oklch(0.98 0 0)" }}
                >
                  {isSavingNote ? "Saving…" : "Save"}
                </button>
              </div>
              {notesLoading ? (
                <div className="text-center py-8">
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "oklch(0.55 0.18 250 / 40%)", borderTopColor: "transparent" }} />
                </div>
              ) : dbNotes.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.30 0.01 250)" }} />
                  <p className="text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>No notes yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...dbNotes].reverse().map(n => (
                    <div key={n.id} className="px-3 py-2.5 rounded-lg text-sm" style={{ background: "oklch(0.18 0.025 250)", borderLeft: "2px solid oklch(0.55 0.18 250 / 50%)" }}>
                      <div className="text-xs mb-1" style={{ color: "oklch(0.40 0.01 250)" }}>{formatTimestamp(n.timestamp)}</div>
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
                  { label: "Case Type", value: lead.caseType },
                  { label: "Case Number", value: lead.caseNumber || "—" },
                  { label: "Date Added", value: formatDate(lead.date) },
                  { label: "Stage", value: lead.stage },
                  { label: "Source", value: lead.source || "—" },
                  { label: "Referred By", value: lead.referredBy || "—" },
                  { label: "Quoted", value: lead.quotedAmount > 0 ? formatCurrency(lead.quotedAmount) : "—" },
                  { label: "Email", value: lead.email || "—" },
                  ...(lead.stage === "Lost" && lead.lostReason ? [{ label: "Lost Reason", value: lead.lostReason }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-3" style={{ background: "oklch(0.18 0.025 250)" }}>
                    <div className="text-xs mb-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>{label}</div>
                    <div className="text-sm font-medium" style={{ color: "oklch(0.82 0.005 250)" }}>{value}</div>
                  </div>
                ))}
              </div>
              {lead.notes && (
                <div className="rounded-lg p-3" style={{ background: "oklch(0.18 0.025 250)" }}>
                  <div className="text-xs mb-1" style={{ color: "oklch(0.45 0.01 250)" }}>Notes</div>
                  <div className="text-sm leading-relaxed" style={{ color: "oklch(0.75 0.01 250)" }}>{lead.notes}</div>
                </div>
              )}
              {/* Retainer Balance Tracker */}
              {lead.stage === "Retained" && lead.retainerBooked > 0 && (() => {
                const outstanding = lead.retainerBooked - totalReceived;
                const pct = Math.min(100, totalReceived > 0 ? Math.round((totalReceived / lead.retainerBooked) * 100) : 0);
                const balanceColor = outstanding <= 0 ? "oklch(0.65 0.18 145)" : totalReceived === 0 ? "oklch(0.70 0.22 25)" : "oklch(0.72 0.12 75)";
                const balanceLabel = outstanding <= 0 ? "Fully Paid" : totalReceived === 0 ? "Nothing Collected" : "Partially Paid";
                return (
                  <div className="rounded-lg p-4 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: `${balanceColor} / 30%` }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.45 0.01 250)" }}>Retainer Balance</div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <div className="text-xs mb-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>Booked</div>
                        <div className="text-sm font-bold" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(lead.retainerBooked)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs mb-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>Collected</div>
                        <div className="text-sm font-bold" style={{ color: "oklch(0.65 0.18 145)" }}>{formatCurrency(totalReceived)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs mb-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>Outstanding</div>
                        <div className="text-sm font-bold" style={{ color: balanceColor }}>{formatCurrency(Math.max(0, outstanding))}</div>
                      </div>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden mb-1" style={{ background: "oklch(0.22 0.025 250)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: balanceColor }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{pct}% collected</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${balanceColor} / 15%`, color: balanceColor }}>{balanceLabel}</span>
                    </div>
                  </div>
                );
              })()}

              {leadPayments.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.45 0.01 250)" }}>Payment History</div>
                  <div className="space-y-1.5">
                    {[...leadPayments].sort((a, b) => b.date.localeCompare(a.date)).map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs px-3 py-2 rounded" style={{ background: "oklch(0.18 0.025 250)" }}>
                        <div className="flex flex-col gap-0.5">
                          <div>
                            <span style={{ color: "oklch(0.65 0.01 250)" }}>{formatDate(p.date)}</span>
                            <span className="ml-2" style={{ color: "oklch(0.75 0.01 250)" }}>{p.receivedFor}</span>
                          </div>
                          {p.linkedInstallmentId && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.25 0.06 75)", color: "oklch(0.72 0.12 75)" }}>
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              Auto-linked to installment plan
                            </span>
                          )}
                        </div>
                        <span className="font-bold" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ── Installments Tab ── */}
          {detailTab === "installments" && leadId && (
            <InstallmentsTab leadId={leadId} />
          )}

        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Installments Tab — separate component to isolate tRPC hooks
// ─────────────────────────────────────────────────────────────────────────────

function InstallmentsTab({ leadId }: { leadId: string }) {
  const utils = trpc.useUtils();
  const { data: plans = [], isLoading } = trpc.getInstallmentPlans.useQuery({ leadId });

  const createPlan = trpc.createInstallmentPlan.useMutation({
    onSuccess: () => { utils.getInstallmentPlans.invalidate({ leadId }); toast.success("Payment plan created"); setShowForm(false); },
    onError: () => toast.error("Failed to create plan"),
  });
  const deletePlan = trpc.deleteInstallmentPlan.useMutation({
    onSuccess: () => { utils.getInstallmentPlans.invalidate({ leadId }); toast.success("Plan deleted"); },
  });
  const togglePaid = trpc.toggleInstallmentItemPaid.useMutation({
    onSuccess: () => utils.getInstallmentPlans.invalidate({ leadId }),
  });
  const updateDueDate = trpc.updateInstallmentItemDueDate.useMutation({
    onSuccess: () => utils.getInstallmentPlans.invalidate({ leadId }),
  });

  const [showForm, setShowForm] = useState(false);
  const [formTotal, setFormTotal] = useState("");
  const [formCount, setFormCount] = useState("6");
  const [formStart, setFormStart] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
  const [editingDueDateItemId, setEditingDueDateItemId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const handleCreatePlan = () => {
    const total = parseFloat(formTotal);
    const count = parseInt(formCount);
    if (!total || total <= 0) { toast.error("Enter a valid total amount"); return; }
    if (!count || count < 1 || count > 120) { toast.error("Enter installment count (1–120)"); return; }
    if (!formStart) { toast.error("Select a start date"); return; }
    createPlan.mutate({ leadId, totalAmount: total, installmentCount: count, startDate: formStart, notes: formNotes });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "oklch(0.72 0.12 75)" }} />
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Add plan button */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed text-sm font-medium transition-all hover:border-solid hover:bg-white/5"
          style={{ borderColor: "oklch(0.72 0.12 75 / 40%)", color: "oklch(0.72 0.12 75)" }}
        >
          <Plus className="w-4 h-4" />
          New Installment Plan
        </button>
      ) : (
        <div className="rounded-lg border p-4 space-y-3" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 35%)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>New Payment Plan</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.01 250)" }}>Total Amount ($)</label>
              <input
                type="number" value={formTotal} onChange={e => setFormTotal(e.target.value)}
                placeholder="e.g. 3000" min="1"
                className="w-full px-3 py-2 rounded text-sm outline-none"
                style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: "oklch(0.90 0.005 250)" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.01 250)" }}>No. of Installments</label>
              <input
                type="number" value={formCount} onChange={e => setFormCount(e.target.value)}
                placeholder="e.g. 6" min="1" max="120"
                className="w-full px-3 py-2 rounded text-sm outline-none"
                style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: "oklch(0.90 0.005 250)" }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.01 250)" }}>First Payment Date</label>
            <input
              type="date" value={formStart} onChange={e => setFormStart(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: "oklch(0.90 0.005 250)", colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.01 250)" }}>Notes (optional)</label>
            <input
              type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)}
              placeholder="e.g. Monthly payments"
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: "oklch(0.90 0.005 250)" }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreatePlan}
              disabled={createPlan.isPending}
              className="flex-1 py-2 rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}
            >
              {createPlan.isPending ? "Creating..." : "Create Plan"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded hover:bg-white/8" style={{ color: "oklch(0.50 0.01 250)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Plans list */}
      {plans.length === 0 && !showForm && (
        <div className="text-center py-10">
          <CreditCard className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.30 0.01 250)" }} />
          <p className="text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>No installment plans yet.</p>
          <p className="text-xs mt-1" style={{ color: "oklch(0.35 0.01 250)" }}>Click “New Installment Plan” to create one.</p>
        </div>
      )}

      {plans.map(plan => {
        const collected = plan.items.filter(i => i.isPaid).reduce((s, i) => s + i.amount, 0);
        const outstanding = plan.totalAmount - collected;
        const pct = plan.totalAmount > 0 ? Math.min(100, (collected / plan.totalAmount) * 100) : 0;
        const paidCount = plan.items.filter(i => i.isPaid).length;
        const overdueCount = plan.items.filter(i => !i.isPaid && i.dueDate < today).length;

        return (
          <div key={plan.id} className="rounded-xl border overflow-hidden" style={{ background: "oklch(0.17 0.025 250)", borderColor: "oklch(1 0 0 / 10%)" }}>
            {/* Plan header */}
            <div className="px-4 py-3 border-b" style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.19 0.025 250)" }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: "oklch(0.93 0.005 250)" }}>{formatCurrency(plan.totalAmount)}</span>
                    <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>· {plan.installmentCount} installments</span>
                    {overdueCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "oklch(0.65 0.22 25 / 20%)", color: "oklch(0.65 0.22 25)" }}>
                        {overdueCount} overdue
                      </span>
                    )}
                  </div>
                  {plan.notes && <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.01 250)" }}>{plan.notes}</p>}
                </div>
                {confirmDeleteId === plan.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => deletePlan.mutate({ id: plan.id })} className="text-xs px-2 py-1 rounded font-semibold" style={{ background: "oklch(0.65 0.22 25 / 20%)", color: "oklch(0.65 0.22 25)" }}>Delete</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-1 rounded" style={{ color: "oklch(0.50 0.01 250)" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(plan.id)} className="p-1 rounded hover:bg-white/8" style={{ color: "oklch(0.45 0.01 250)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "oklch(0.55 0.01 250)" }}>Collected: <strong style={{ color: "oklch(0.65 0.18 145)" }}>{formatCurrency(collected)}</strong></span>
                  <span style={{ color: "oklch(0.55 0.01 250)" }}>
                    {outstanding <= 0
                      ? <strong style={{ color: "oklch(0.65 0.18 145)" }}>PAID IN FULL ✓</strong>
                      : <strong style={{ color: "oklch(0.70 0.22 25)" }}>Outstanding: {formatCurrency(outstanding)}</strong>
                    }
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: outstanding <= 0 ? "oklch(0.55 0.18 145)" : "oklch(0.72 0.12 75)" }}
                  />
                </div>
                <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>
                  {paidCount} of {plan.installmentCount} paid
                </div>
              </div>
            </div>

            {/* Installment schedule */}
            <div className="divide-y divide-white/[0.06]">
              {plan.items.map(item => {
                const isOverdue = !item.isPaid && item.dueDate < today;
                const isDueToday = !item.isPaid && item.dueDate === today;
                const isEditingDate = editingDueDateItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      background: item.isPaid ? "oklch(0.55 0.18 145 / 5%)" : isOverdue ? "oklch(0.65 0.22 25 / 5%)" : "transparent",
                      borderLeft: `3px solid ${
                        item.isPaid ? "oklch(0.55 0.18 145)" : isOverdue ? "oklch(0.65 0.22 25)" : isDueToday ? "oklch(0.72 0.15 80)" : "transparent"
                      }`,
                    }}
                  >
                    {/* Paid toggle */}
                    <button
                      onClick={() => togglePaid.mutate({ id: item.id, isPaid: !item.isPaid, paidDate: !item.isPaid ? today : null })}
                      className="flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all"
                      style={{
                        background: item.isPaid ? "oklch(0.55 0.18 145)" : "transparent",
                        borderColor: item.isPaid ? "oklch(0.55 0.18 145)" : "oklch(0.40 0.01 250)",
                      }}
                      title={item.isPaid ? "Mark as unpaid" : "Mark as paid"}
                    >
                      {item.isPaid && <Check className="w-3 h-3" style={{ color: "oklch(0.13 0.025 250)" }} />}
                    </button>

                    {/* Installment number */}
                    <span className="text-xs font-mono flex-shrink-0 w-5 text-center" style={{ color: "oklch(0.45 0.01 250)" }}>#{item.installmentNumber}</span>

                    {/* Due date (clickable to edit) */}
                    <div className="flex-1 min-w-0">
                      {isEditingDate ? (
                        <input
                          type="date"
                          defaultValue={item.dueDate}
                          autoFocus
                          className="px-2 py-0.5 rounded text-xs outline-none"
                          style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 50%)", color: "oklch(0.90 0.005 250)", colorScheme: "dark" }}
                          onChange={e => {
                            if (e.target.value) {
                              updateDueDate.mutate({ id: item.id, dueDate: e.target.value });
                              setEditingDueDateItemId(null);
                            }
                          }}
                          onBlur={() => setEditingDueDateItemId(null)}
                          onKeyDown={e => { if (e.key === "Escape") setEditingDueDateItemId(null); }}
                        />
                      ) : (
                        <button
                          onClick={() => !item.isPaid && setEditingDueDateItemId(item.id)}
                          className="text-xs text-left transition-colors"
                          style={{
                            color: item.isPaid ? "oklch(0.50 0.01 250)" : isOverdue ? "oklch(0.65 0.22 25)" : isDueToday ? "oklch(0.72 0.15 80)" : "oklch(0.65 0.01 250)",
                            textDecoration: item.isPaid ? "line-through" : "none",
                            cursor: item.isPaid ? "default" : "pointer",
                          }}
                          title={item.isPaid ? undefined : "Click to change due date"}
                        >
                          {new Date(item.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {isOverdue && <span className="ml-1 text-[10px]">(overdue)</span>}
                          {isDueToday && <span className="ml-1 text-[10px]">(today)</span>}
                        </button>
                      )}
                      {item.isPaid && item.paidDate && (
                        <div className="text-[10px]" style={{ color: "oklch(0.45 0.01 250)" }}>
                          Paid {new Date(item.paidDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <span
                      className="text-sm font-bold flex-shrink-0"
                      style={{ color: item.isPaid ? "oklch(0.55 0.18 145)" : "oklch(0.72 0.12 75)" }}
                    >
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
