import { todayPST, tomorrowPST } from "@/lib/timezone";
/* ============================================================
   LeadDetailPanel — shared slide-over component
   Design: Dark luxury navy/gold — Playfair Display headings
   Used by: Leads page, FollowUps page
   Opens as a right-side fixed panel over any page.
   Self-contained: calls useCRM() directly.

   Layout (v3 — unified):
   ┌─────────────────────────────────────────┐
   │ HEADER: name · stage badge · phone · X  │
   │ (retainer bar if Retained)              │
   ├─────────────────────────────────────────┤
   │ SECTION 1 — CLIENT INFO + CASE NOTES   │
   │  • All lead fields (case type, source,  │
   │    date, quoted, email, referred by…)   │
   │  • Case notes textarea (inline edit)    │
   ├─────────────────────────────────────────┤
   │ SECTION 2 — ACTIVITY / COMMENTS        │
   │  • Per follow-up comments log           │
   │  • Quick comment input                  │
   ├─────────────────────────────────────────┤
   │ SECTION 3 — PAYMENT PLANS (collapsible)│
   │ SECTION 4 — ONBOARDING (collapsible)   │
   └─────────────────────────────────────────┘
   ============================================================ */
import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useCRM } from "@/contexts/CRMContext";
import { useActiveMember } from "@/contexts/ActiveMemberContext";
import {
  type Lead, type FollowUp, type LeadStage,
  formatCurrency, formatDate,
} from "@/lib/store";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  FileText, X, Phone, Edit2, CheckCircle, CheckCircle2, Circle,
  Check, ChevronDown, CreditCard, MessageSquare, Trash2, Plus, Calendar, CheckCheck, Pencil,
  AlertCircle, StickyNote, PhoneCall,
} from "lucide-react";

// ── CompleteFollowUpModal ──────────────────────────────────
function CompleteFollowUpModal({
  lead,
  onConfirm,
  onCancel,
}: {
  lead: Lead;
  onConfirm: (note: string, nextDate: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState("");
  const today = todayPST();
  const canSubmit = note.trim().length > 0 && nextDate.length > 0;

  const getQuickDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  };

  const QUICK_PICKS = [
    { label: "Tomorrow", days: 1 },
    { label: "3 Days",   days: 3 },
    { label: "1 Week",   days: 7 },
    { label: "2 Weeks",  days: 14 },
    { label: "1 Month",  days: 30 },
    { label: "2 Months", days: 60 },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 70%)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4"
        style={{ background: "oklch(0.18 0.025 250)", border: "1px solid oklch(1 0 0 / 14%)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4" style={{ color: "oklch(0.55 0.18 145)" }} />
              <h2 className="text-sm font-bold" style={{ color: "oklch(0.93 0.005 250)", fontFamily: "'Playfair Display', serif" }}>
                Complete Follow-Up
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.01 250)" }}>
              {lead.name} · {lead.caseType}
            </p>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-white/8 transition-colors" style={{ color: "oklch(0.45 0.01 250)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Field 1: Closing note (mandatory) */}
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "oklch(0.72 0.12 75)" }}>
            What happened? <span style={{ color: "oklch(0.70 0.22 25)" }}>*</span>
          </label>
          <textarea
            autoFocus
            rows={3}
            placeholder='e.g. "Spoke with client — sending retainer agreement", "No answer, left voicemail"'
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-xs resize-none outline-none"
            style={{
              background: "oklch(0.22 0.025 250)",
              border: `1px solid ${note.trim() ? "oklch(0.55 0.18 145 / 40%)" : "oklch(1 0 0 / 12%)"}`,
              color: "oklch(0.90 0.005 250)",
            }}
          />
          {!note.trim() && (
            <p className="text-[10px] mt-1" style={{ color: "oklch(0.50 0.01 250)" }}>Required — describe what happened in this follow-up</p>
          )}
        </div>

        {/* Field 2: Next follow-up date (mandatory) */}
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "oklch(0.72 0.12 75)" }}>
            Next follow-up date <span style={{ color: "oklch(0.70 0.22 25)" }}>*</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {QUICK_PICKS.map(({ label, days }) => {
              const val = getQuickDate(days);
              const isSelected = nextDate === val;
              return (
                <button
                  key={label}
                  onClick={() => setNextDate(val)}
                  className="text-[11px] px-2 py-1.5 rounded-lg font-medium transition-all"
                  style={{
                    background: isSelected ? "oklch(0.72 0.12 75 / 20%)" : "oklch(0.25 0.025 250)",
                    color: isSelected ? "oklch(0.72 0.12 75)" : "oklch(0.60 0.01 250)",
                    border: `1px solid ${isSelected ? "oklch(0.72 0.12 75 / 50%)" : "oklch(1 0 0 / 8%)"}`,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            type="date"
            value={nextDate}
            min={today}
            onChange={e => setNextDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-xs outline-none"
            style={{
              background: "oklch(0.22 0.025 250)",
              border: `1px solid ${nextDate ? "oklch(0.55 0.18 145 / 40%)" : "oklch(1 0 0 / 12%)"}`,
              color: "oklch(0.90 0.005 250)",
              colorScheme: "dark",
            }}
          />
          {!nextDate && (
            <p className="text-[10px] mt-1" style={{ color: "oklch(0.50 0.01 250)" }}>Required — set when to follow up next</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => canSubmit && onConfirm(note.trim(), nextDate)}
            disabled={!canSubmit}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canSubmit ? "oklch(0.55 0.18 145)" : "oklch(0.30 0.025 250)",
              color: canSubmit ? "oklch(0.13 0.025 250)" : "oklch(0.45 0.01 250)",
            }}
          >
            Complete &amp; Set Next Date
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ background: "oklch(0.25 0.025 250)", color: "oklch(0.55 0.01 250)" }}
          >
            Cancel
          </button>
        </div>
        {!canSubmit && (
          <p className="text-[10px] text-center" style={{ color: "oklch(0.45 0.01 250)" }}>
            Both fields are required to complete this follow-up
          </p>
        )}
      </div>
    </div>
  );
}

// // ── RescheduleModal ────────────────────────────────────
function RescheduleModal({
  lead,
  initialDate,
  onConfirm,
  onCancel,
}: {
  lead: Lead;
  initialDate: string;
  onConfirm: (note: string, newDate: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [newDate, setNewDate] = useState(initialDate);
  const today = todayPST();
  const canSubmit = note.trim().length > 0 && newDate.length > 0;

  const getQuickDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  };

  const QUICK_PICKS = [
    { label: "Tomorrow", days: 1 },
    { label: "3 Days",   days: 3 },
    { label: "1 Week",   days: 7 },
    { label: "2 Weeks",  days: 14 },
    { label: "1 Month",  days: 30 },
    { label: "2 Months", days: 60 },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 70%)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4"
        style={{ background: "oklch(0.18 0.025 250)", border: "1px solid oklch(1 0 0 / 14%)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: "oklch(0.65 0.15 200)" }} />
              <h2 className="text-sm font-bold" style={{ color: "oklch(0.93 0.005 250)", fontFamily: "'Playfair Display', serif" }}>
                Reschedule Follow-Up
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.01 250)" }}>
              {lead.name} · {lead.caseType}
            </p>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-white/8 transition-colors" style={{ color: "oklch(0.45 0.01 250)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "oklch(0.65 0.15 200)" }}>
            Why are you rescheduling? <span style={{ color: "oklch(0.70 0.22 25)" }}>*</span>
          </label>
          <textarea
            autoFocus
            rows={3}
            placeholder='e.g. "Client asked to call back next week", "Waiting on documents", "No answer — trying again"'
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-xs resize-none outline-none"
            style={{
              background: "oklch(0.22 0.025 250)",
              border: `1px solid ${note.trim() ? "oklch(0.65 0.15 200 / 40%)" : "oklch(1 0 0 / 12%)"}`,
              color: "oklch(0.90 0.005 250)",
            }}
          />
          {!note.trim() && (
            <p className="text-[10px] mt-1" style={{ color: "oklch(0.50 0.01 250)" }}>Required — a reason must be logged for every reschedule</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "oklch(0.65 0.15 200)" }}>
            New follow-up date <span style={{ color: "oklch(0.70 0.22 25)" }}>*</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {QUICK_PICKS.map(({ label, days }) => {
              const val = getQuickDate(days);
              const isSelected = newDate === val;
              return (
                <button
                  key={label}
                  onClick={() => setNewDate(val)}
                  className="text-[11px] px-2 py-1.5 rounded-lg font-medium transition-all"
                  style={{
                    background: isSelected ? "oklch(0.65 0.15 200 / 20%)" : "oklch(0.25 0.025 250)",
                    color: isSelected ? "oklch(0.65 0.15 200)" : "oklch(0.60 0.01 250)",
                    border: `1px solid ${isSelected ? "oklch(0.65 0.15 200 / 50%)" : "oklch(1 0 0 / 8%)"}`,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            type="date"
            value={newDate}
            min={today}
            onChange={e => setNewDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-xs outline-none"
            style={{
              background: "oklch(0.22 0.025 250)",
              border: `1px solid ${newDate ? "oklch(0.65 0.15 200 / 40%)" : "oklch(1 0 0 / 12%)"}`,
              color: "oklch(0.90 0.005 250)",
              colorScheme: "dark",
            }}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => canSubmit && onConfirm(note.trim(), newDate)}
            disabled={!canSubmit}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canSubmit ? "oklch(0.65 0.15 200)" : "oklch(0.30 0.025 250)",
              color: canSubmit ? "oklch(0.10 0.02 250)" : "oklch(0.45 0.01 250)",
            }}
          >
            Reschedule
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ background: "oklch(0.25 0.025 250)", color: "oklch(0.55 0.01 250)" }}
          >
            Cancel
          </button>
        </div>
        {!canSubmit && (
          <p className="text-[10px] text-center" style={{ color: "oklch(0.45 0.01 250)" }}>
            Both a reason and a new date are required to reschedule
          </p>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────
const ALL_STAGES: LeadStage[] = ["New Lead", "Consultation", "Follow-Up", "Retained", "Onboarding", "Lost"];

const stageColor: Record<string, string> = {
  "New Lead":     "oklch(0.55 0.18 250)",
  "Consultation": "oklch(0.72 0.15 80)",
  "Follow-Up":    "oklch(0.65 0.15 60)",
  "Retained":     "oklch(0.55 0.18 145)",
  "Onboarding":   "oklch(0.55 0.18 200)",
  "Lost":         "oklch(0.60 0.22 25)",
};

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" })
  );
}

// ── Props ──────────────────────────────────────────────────
interface LeadDetailPanelProps {
  leadId: string | null;
  onClose: () => void;
  onEditLead?: (lead: Lead) => void;
  onConvertLead?: (lead: Lead) => void;
  initialTab?: "followups" | "notes" | "info" | "installments" | "onboarding";
}

export default function LeadDetailPanel({
  leadId,
  onClose,
  onEditLead,
  onConvertLead,
}: LeadDetailPanelProps) {
  const {
    leads, payments,
    updateLead, addPayment, addLeadNote, setLeadFollowUpDate,
  } = useCRM();

  const utils = trpc.useUtils();
  const { activeMember } = useActiveMember();

  // UI state
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [editingLeadNotes, setEditingLeadNotes] = useState(false);
  const [leadNotesText, setLeadNotesText] = useState("");
  const [activityComment, setActivityComment] = useState("");
  const [showFollowUpDatePicker, setShowFollowUpDatePicker] = useState(false);
  const [followUpDateInput, setFollowUpDateInput] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [pendingRescheduleDate, setPendingRescheduleDate] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const followUpDatePickerRef = useRef<HTMLDivElement>(null);

  const deleteNoteMut = trpc.leads.deleteNote.useMutation({ onSuccess: () => refetchNotes() });
  const updateNoteMut = trpc.leads.updateNote.useMutation({ onSuccess: () => { refetchNotes(); setEditingNoteId(null); } });

  const handleDeleteNote = (noteId: string) => {
    if (!confirm("Delete this activity note?")) return;
    deleteNoteMut.mutate({ id: noteId, leadId: lead?.id ?? "" });
  };

  const handleSaveEditNote = (noteId: string) => {
    const text = editingNoteText.trim();
    if (!text) return;
    updateNoteMut.mutate({ id: noteId, leadId: lead?.id ?? "", text });
  };

  // Close follow-up date picker on outside click
  useEffect(() => {
    if (!showFollowUpDatePicker) return;
    const handler = (e: MouseEvent) => {
      if (followUpDatePickerRef.current && !followUpDatePickerRef.current.contains(e.target as Node)) {
        setShowFollowUpDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFollowUpDatePicker]);
  const [installmentsExpanded, setInstallmentsExpanded] = useState(false);
  const [onboardingExpanded, setOnboardingExpanded] = useState(true);
  const [showInlineConvert, setShowInlineConvert] = useState(false);
  const [inlineConvertForm, setInlineConvertForm] = useState({ retainerBooked: "", downpayment: "", caseNumber: "", notes: "" });
  const stageDropdownRef = useRef<HTMLDivElement>(null);

  // Close stage dropdown on outside click
  useEffect(() => {
    if (!stageDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) {
        setStageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [stageDropdownOpen]);

  const handleStageChange = async (newStage: LeadStage) => {
    setStageDropdownOpen(false);
    if (!lead || newStage === lead.stage) return;
    if (newStage === "Retained") {
      if (onConvertLead) {
        onConvertLead(lead);
      } else {
        setInlineConvertForm({ retainerBooked: "", downpayment: "", caseNumber: lead.caseNumber || "", notes: "" });
        setShowInlineConvert(true);
      }
      return;
    }
    await updateLead(lead.id, { stage: newStage });
    toast.success(`Moved to ${newStage}`);
  };

  const handleInlineConvert = async () => {
    if (!lead) return;
    const retainer = parseFloat(inlineConvertForm.retainerBooked) || 0;
    const dp = parseFloat(inlineConvertForm.downpayment) || 0;
    if (retainer <= 0) { toast.error("Enter retainer amount"); return; }
    await updateLead(lead.id, {
      stage: "Retained",
      retainerBooked: retainer,
      downpayment: dp,
      caseNumber: inlineConvertForm.caseNumber || lead.caseNumber,
      convertedDate: todayPST(),
    });
    if (dp > 0) {
      await addPayment({
        date: todayPST(),
        clientName: lead.name,
        leadId: lead.id,
        caseType: lead.caseType,
        caseNumber: inlineConvertForm.caseNumber || lead.caseNumber,
        paymentType: "New Client",
        amount: dp,
        receivedFor: "Retainer downpayment",
        notes: inlineConvertForm.notes,
      });
    }
    toast.success(`${lead.name} converted to Retained`);
    setShowInlineConvert(false);
    setInlineConvertForm({ retainerBooked: "", downpayment: "", caseNumber: "", notes: "" });
  };

  const lead = useMemo(
    () => (leadId ? leads.find(l => l.id === leadId) ?? null : null),
    [leadId, leads]
  );

  // Lead notes (activity thread) — fetched per lead
  const { data: rawLeadNotes = [], refetch: refetchNotes } = trpc.leads.getNotes.useQuery(
    { leadId: leadId! },
    { enabled: !!leadId }
  );
  const leadNotes = useMemo(
    () => [...rawLeadNotes].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [rawLeadNotes]
  );

  const leadPayments = useMemo(
    () => (lead ? payments.filter(p => p.leadId === lead.id) : []),
    [lead, payments]
  );

  const totalReceived = leadPayments.reduce((s, p) => s + p.amount, 0);

  if (!lead) return null;

  const handleAddActivityComment = async () => {
    const text = activityComment.trim();
    if (!text) return;
    await addLeadNote(lead.id, text, activeMember?.name ?? undefined);
    setActivityComment("");
    refetchNotes();
    toast.success("Comment added");
  };

  const handleSetFollowUpDate = (date: string | null) => {
    setShowFollowUpDatePicker(false);
    if (!date) {
      // Clearing the date — no note required
      setLeadFollowUpDate(lead.id, null);
      toast.success("Follow-up date cleared");
      return;
    }
    if (lead.followUpDate && lead.followUpDate !== date) {
      // Changing an existing date — require a reason note
      setPendingRescheduleDate(date);
      setShowRescheduleModal(true);
    } else {
      // First-time set — allow directly
      setLeadFollowUpDate(lead.id, date);
      toast.success(`Follow-up set for ${formatDate(date)}`);
    }
  };

  const handleRescheduleConfirm = async (note: string, newDate: string) => {
    setShowRescheduleModal(false);
    const memberName = activeMember?.name ?? "Staff";
    const rescheduledOn = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric",
    });
    const auditNote = `${note}\n__RESCHEDULE__:${memberName}:${rescheduledOn}:${newDate}`;
    await addLeadNote(lead.id, auditNote, activeMember?.name ?? undefined);
    await setLeadFollowUpDate(lead.id, newDate);
    refetchNotes();
    toast.success(`Rescheduled to ${formatDate(newDate)} — reason logged`);
  };

  const handleCompleteFollowUp = async (note: string, nextDate: string) => {
    setShowCompleteModal(false);
    const completedOn = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric",
    });
    const memberName = activeMember?.name ?? "Staff";
    // Save one combined entry: note text + completion tag on the same line
    // Format: "<note text>\n__DONE__:<member>:<date>"
    const combinedNote = `${note}\n__DONE__:${memberName}:${completedOn}`;
    await addLeadNote(lead.id, combinedNote, activeMember?.name ?? undefined);
    // Set the next follow-up date
    await setLeadFollowUpDate(lead.id, nextDate);
    refetchNotes();
    toast.success(`Follow-up done · Next: ${formatDate(nextDate)}`);
  };

  // ── Render ─────────────────────────────────────────────────
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
          width: "min(520px, 100vw)",
          background: "oklch(0.15 0.025 250)",
          borderLeft: "1px solid oklch(0.72 0.12 75 / 25%)",
        }}
      >
        {/* ── Panel Header ── */}
        <div
          className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "oklch(1 0 0 / 10%)" }}
        >
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="text-lg font-bold truncate"
                style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}
              >
                {lead.name}
              </h2>
              {/* Stage dropdown */}
              <div className="relative flex-shrink-0" ref={stageDropdownRef}>
                <button
                  onClick={() => setStageDropdownOpen(v => !v)}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium transition-all hover:opacity-80"
                  style={{
                    background: `${stageColor[lead.stage] ?? "oklch(0.55 0.01 250)"}25`,
                    color: stageColor[lead.stage] ?? "oklch(0.55 0.01 250)",
                    border: `1px solid ${stageColor[lead.stage] ?? "oklch(0.55 0.01 250)"}40`,
                  }}
                  title="Click to change stage"
                >
                  {lead.stage}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {stageDropdownOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ background: "oklch(0.20 0.03 250)", border: "1px solid oklch(1 0 0 / 15%)" }}
                  >
                    {ALL_STAGES.map(s => (
                      <button
                        key={s}
                        onClick={() => handleStageChange(s)}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-white/8"
                        style={{ color: s === lead.stage ? stageColor[s] : "oklch(0.80 0.005 250)" }}
                      >
                        {s === lead.stage
                          ? <Check className="w-3 h-3 flex-shrink-0" style={{ color: stageColor[s] }} />
                          : <span className="w-3 h-3 flex-shrink-0" />}
                        <span style={{ color: stageColor[s] ?? "oklch(0.80 0.005 250)" }}>{s}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Phone + case type row */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}
              >
                {lead.caseType}
              </span>
              {lead.caseNumber && (
                <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>#{lead.caseNumber}</span>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-1 text-xs hover:underline"
                  style={{ color: "oklch(0.65 0.01 250)" }}
                >
                  <Phone className="w-3 h-3" />{lead.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEditLead && (
              <button
                onClick={() => onEditLead(lead)}
                className="p-1.5 rounded hover:bg-white/8 transition-colors"
                title="Edit lead"
                style={{ color: "oklch(0.72 0.12 75)" }}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onConvertLead && lead.stage !== "Retained" && lead.stage !== "Lost" && (
              <button
                onClick={() => onConvertLead(lead)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors"
                style={{
                  background: "oklch(0.55 0.18 145 / 15%)",
                  color: "oklch(0.55 0.18 145)",
                  border: "1px solid oklch(0.55 0.18 145 / 30%)",
                }}
              >
                <CheckCircle className="w-3 h-3" /> Convert
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-white/8 transition-colors"
              style={{ color: "oklch(0.55 0.01 250)" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Retainer bar (Retained leads only) ── */}
        {lead.stage === "Retained" && lead.retainerBooked > 0 && (() => {
          const pct = Math.min(100, (totalReceived / lead.retainerBooked) * 100);
          const outstanding = lead.retainerBooked - totalReceived;
          return (
            <div
              className="px-5 py-3 border-b flex-shrink-0"
              style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.17 0.025 250)" }}
            >
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: "oklch(0.55 0.01 250)" }}>
                  Retainer: <strong style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(lead.retainerBooked)}</strong>
                </span>
                <span style={{ color: "oklch(0.55 0.01 250)" }}>
                  Rcvd: <strong style={{ color: "oklch(0.65 0.18 145)" }}>{formatCurrency(totalReceived)}</strong>
                </span>
                <span style={{ color: "oklch(0.55 0.01 250)" }}>
                  {outstanding <= 0
                    ? <strong style={{ color: "oklch(0.65 0.18 145)" }}>PAID ✓</strong>
                    : <strong style={{ color: "oklch(0.70 0.22 25)" }}>Owed: {formatCurrency(outstanding)}</strong>
                  }
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: outstanding <= 0 ? "oklch(0.55 0.18 145)" : "oklch(0.72 0.12 75)",
                  }}
                />
              </div>
            </div>
          );
        })()}

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══════════════════════════════════════════════════
              SECTION 1 — CLIENT INFO + CASE NOTES (combined)
              ══════════════════════════════════════════════════ */}
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>

            {/* Section label */}
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.12 75)" }} />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "oklch(0.72 0.12 75)" }}
              >
                Client Info &amp; Case Notes
              </span>
            </div>

            {/* Lead fields grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {[
                { label: "Case Type",   value: lead.caseType },
                { label: "Date Added",  value: formatDate(lead.date) },
                { label: "Source",      value: lead.source || "—" },
                { label: "Referred By", value: lead.referredBy || "—" },
                { label: "Quoted",      value: lead.quotedAmount > 0 ? formatCurrency(lead.quotedAmount) : "—" },
                { label: "Email",       value: lead.email || "—" },
                ...(lead.caseNumber ? [{ label: "Case #", value: lead.caseNumber }] : []),
                ...(lead.retainerBooked > 0 ? [{ label: "Retainer", value: formatCurrency(lead.retainerBooked) }] : []),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg p-2.5"
                  style={{ background: "oklch(0.18 0.025 250)" }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wider mb-0.5"
                    style={{ color: "oklch(0.40 0.01 250)" }}
                  >
                    {label}
                  </div>
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: "oklch(0.82 0.005 250)" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Case Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "oklch(0.55 0.01 250)" }}
                >
                  Case Notes
                </span>
                {!editingLeadNotes && (
                  <button
                    onClick={() => { setLeadNotesText(lead.notes || ""); setEditingLeadNotes(true); }}
                    className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                    style={{ color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}
                  >
                    {lead.notes ? "Edit" : "+ Add"}
                  </button>
                )}
              </div>

              {editingLeadNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={leadNotesText}
                    onChange={e => setLeadNotesText(e.target.value)}
                    autoFocus
                    rows={6}
                    placeholder="Enter case notes, call summaries, client details..."
                    className="w-full px-3 py-2.5 rounded text-sm outline-none resize-none"
                    style={{
                      background: "oklch(0.20 0.025 250)",
                      border: "1px solid oklch(0.72 0.12 75 / 40%)",
                      color: "oklch(0.90 0.005 250)",
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await updateLead(lead.id, { notes: leadNotesText });
                        setEditingLeadNotes(false);
                        toast.success("Notes saved");
                      }}
                      className="px-3 py-1 rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                      style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingLeadNotes(false)}
                      className="px-3 py-1 rounded text-xs hover:bg-white/8 transition-colors"
                      style={{ color: "oklch(0.55 0.01 250)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : lead.notes ? (
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap px-3 py-2.5 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    background: "oklch(0.18 0.025 250)",
                    color: "oklch(0.82 0.005 250)",
                    border: "1px solid oklch(0.72 0.12 75 / 15%)",
                  }}
                  onClick={() => { setLeadNotesText(lead.notes || ""); setEditingLeadNotes(true); }}
                  title="Click to edit"
                >
                  {lead.notes}
                </div>
              ) : (
                <button
                  onClick={() => { setLeadNotesText(""); setEditingLeadNotes(true); }}
                  className="w-full text-left px-3 py-3 rounded-lg border border-dashed text-sm italic transition-all hover:border-solid hover:bg-white/5"
                  style={{ borderColor: "oklch(0.72 0.12 75 / 25%)", color: "oklch(0.40 0.01 250)" }}
                >
                  + Click to add case notes...
                </button>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              SECTION 2 — FOLLOW-UP DATE + ACTIVITY THREAD
              ══════════════════════════════════════════════════ */}
          <div className="px-5 pt-4 pb-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>

            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.18 250)" }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "oklch(0.55 0.18 250)" }}>
                  Activity &amp; Follow-Up
                </span>
              </div>
            </div>

            {/* Follow-Up Date row */}
            <div
              className="rounded-lg px-3 py-2.5 mb-3"
              style={{ background: "oklch(0.18 0.025 250)", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.12 75)" }} />
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>Follow-Up Date</span>
                </div>
                {lead.followUpDate && (
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold transition-all hover:opacity-90"
                    style={{
                      background: "oklch(0.55 0.18 145 / 15%)",
                      color: "oklch(0.65 0.18 145)",
                      border: "1px solid oklch(0.55 0.18 145 / 35%)",
                    }}
                    title="Mark follow-up as done and set next date"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Done
                  </button>
                )}
              </div>
              <div ref={followUpDatePickerRef} className="relative flex items-center gap-2 mt-2">
                <button
                  onClick={() => { setFollowUpDateInput(lead.followUpDate ?? ""); setShowFollowUpDatePicker(p => !p); }}
                  className="text-xs px-2.5 py-1 rounded hover:opacity-80 transition-opacity"
                  style={{
                    color: lead.followUpDate ? "oklch(0.90 0.005 250)" : "oklch(0.45 0.01 250)",
                    border: lead.followUpDate
                      ? "1px solid oklch(0.72 0.12 75 / 40%)"
                      : "1px dashed oklch(0.35 0.01 250)",
                    background: lead.followUpDate ? "oklch(0.72 0.12 75 / 10%)" : "transparent",
                  }}
                >
                  {lead.followUpDate ? formatDate(lead.followUpDate) : "+ Set date"}
                </button>
                {lead.followUpDate && (
                  <button
                    onClick={() => handleSetFollowUpDate(null)}
                    className="text-xs hover:opacity-70"
                    style={{ color: "oklch(0.50 0.01 250)" }}
                    title="Clear follow-up date"
                  >✕</button>
                )}

                {showFollowUpDatePicker && (
                  <div
                    className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-2xl p-3 min-w-[220px]"
                    style={{
                      background: "oklch(0.18 0.025 250)",
                      border: "1px solid oklch(1 0 0 / 14%)",
                    }}
                  >
                    <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.72 0.12 75)" }}>
                      Set follow-up date
                    </p>
                    <input
                      type="date"
                      value={followUpDateInput}
                      onChange={e => setFollowUpDateInput(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm mb-2"
                      style={{
                        background: "oklch(0.22 0.025 250)",
                        border: "1px solid oklch(1 0 0 / 12%)",
                        color: "oklch(0.90 0.005 250)",
                        colorScheme: "dark",
                      }}
                      autoFocus
                    />
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      {[
                        { label: "Tomorrow", days: 1 },
                        { label: "3 Days",   days: 3 },
                        { label: "1 Week",   days: 7 },
                        { label: "2 Weeks",  days: 14 },
                        { label: "1 Month",  days: 30 },
                        { label: "2 Months", days: 60 },
                      ].map(({ label, days }) => {
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        const val = d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
                        return (
                          <button
                            key={label}
                            onClick={() => setFollowUpDateInput(val)}
                            className="text-[10px] px-1.5 py-1 rounded transition-colors hover:opacity-90"
                            style={{
                              background: followUpDateInput === val ? "oklch(0.72 0.12 75 / 20%)" : "oklch(0.25 0.025 250)",
                              color: followUpDateInput === val ? "oklch(0.72 0.12 75)" : "oklch(0.60 0.01 250)",
                              border: `1px solid ${followUpDateInput === val ? "oklch(0.72 0.12 75 / 40%)" : "oklch(1 0 0 / 8%)"}`,
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!followUpDateInput) return;
                          handleSetFollowUpDate(followUpDateInput);
                        }}
                        disabled={!followUpDateInput}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                        style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowFollowUpDatePicker(false)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                        style={{ background: "oklch(0.25 0.025 250)", color: "oklch(0.55 0.01 250)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comment input */}
            <div className="flex gap-1.5 mb-3">
              <input
                type="text"
                placeholder="Log a note or update (e.g. Called, no answer — try Friday)"
                value={activityComment}
                onChange={e => setActivityComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && activityComment.trim()) handleAddActivityComment(); }}
                className="flex-1 px-2.5 py-2 rounded text-xs outline-none"
                style={{
                  background: "oklch(0.20 0.025 250)",
                  border: "1px solid oklch(1 0 0 / 12%)",
                  color: "oklch(0.85 0.005 250)",
                }}
              />
              {activityComment.trim() && (
                <button
                  onClick={handleAddActivityComment}
                  className="px-2.5 rounded text-xs font-medium hover:opacity-90 transition-all"
                  style={{
                    background: "oklch(0.55 0.18 250 / 20%)",
                    color: "oklch(0.70 0.12 250)",
                    border: "1px solid oklch(0.55 0.18 250 / 30%)",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Activity thread */}
            {(() => {
              // Build the display list: real notes + synthetic "missed" entries
              // A missed entry is injected when followUpDate is in the past
              // and the most-recent note is NOT a __DONE__ completion entry.
              const today = todayPST();
              const latestNote = leadNotes[0]; // already sorted newest-first
              const latestIsDone = latestNote?.text.match(/\n__DONE__:/);
              const isMissed =
                lead.followUpDate &&
                lead.followUpDate < today &&
                !latestIsDone;

              type DisplayEntry =
                | { kind: "note"; note: typeof leadNotes[0] }
                | { kind: "missed"; date: string };

              const entries: DisplayEntry[] = [];
              // Inject missed entry at the top (newest position)
              if (isMissed) {
                entries.push({ kind: "missed", date: lead.followUpDate! });
              }
              leadNotes.forEach(n => entries.push({ kind: "note", note: n }));

              if (entries.length === 0) {
                return (
                  <div
                    className="text-center py-5 rounded-lg"
                    style={{ background: "oklch(0.17 0.025 250)", border: "1px solid oklch(1 0 0 / 6%)" }}
                  >
                    <MessageSquare className="w-5 h-5 mx-auto mb-1.5" style={{ color: "oklch(0.30 0.01 250)" }} />
                    <p className="text-xs" style={{ color: "oklch(0.40 0.01 250)" }}>No activity yet. Log the first update above.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-1.5">
                  {entries.map((entry, idx) => {
                    // ── Synthetic missed entry ──
                    if (entry.kind === "missed") {
                      return (
                        <div
                          key="__missed__"
                          className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs"
                          style={{
                            background: "oklch(0.70 0.22 25 / 6%)",
                            borderLeft: "2px solid oklch(0.70 0.22 25 / 60%)",
                          }}
                        >
                          {/* Icon */}
                          <div
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                            style={{ background: "oklch(0.70 0.22 25 / 20%)" }}
                          >
                            <AlertCircle className="w-3 h-3" style={{ color: "oklch(0.70 0.22 25)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold" style={{ color: "oklch(0.75 0.18 25)" }}>
                              Follow-up missed
                            </div>
                            <div style={{ color: "oklch(0.55 0.01 250)" }} className="mt-0.5">
                              Scheduled follow-up for {formatDate(entry.date)} was not completed.
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── Real note entry ──
                    const note = entry.note;
                    const doneMatch = note.text.match(/^([\s\S]+?)\n__DONE__:([^:]+):(.+)$/);
                    const rescheduleMatch = note.text.match(/^([\s\S]+?)\n__RESCHEDULE__:([^:]+):([^:]+):(.+)$/);
                    const isDone = !!doneMatch;
                    const isReschedule = !isDone && !!rescheduleMatch;
                    const commentText = isDone ? doneMatch![1] : isReschedule ? rescheduleMatch![1] : note.text;
                    const doneMember = isDone ? doneMatch![2] : null;
                    const doneDate = isDone ? doneMatch![3] : null;
                    const rescheduleMember = isReschedule ? rescheduleMatch![2] : null;
                    const rescheduleOn = isReschedule ? rescheduleMatch![3] : null;
                    const rescheduleNewDate = isReschedule ? rescheduleMatch![4] : null;
                    const isEditing = editingNoteId === note.id;

                    // Determine icon type
                    const iconEl = isDone ? (
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: "oklch(0.55 0.18 145 / 20%)" }}
                      >
                        <CheckCheck className="w-3 h-3" style={{ color: "oklch(0.65 0.18 145)" }} />
                      </div>
                    ) : isReschedule ? (
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: "oklch(0.65 0.15 200 / 20%)" }}
                      >
                        <Calendar className="w-3 h-3" style={{ color: "oklch(0.65 0.15 200)" }} />
                      </div>
                    ) : (
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: "oklch(0.55 0.18 250 / 15%)" }}
                      >
                        <StickyNote className="w-3 h-3" style={{ color: "oklch(0.65 0.12 250)" }} />
                      </div>
                    );

                    return (
                      <div
                        key={note.id}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs group"
                        style={{
                          background: isDone ? "oklch(0.55 0.18 145 / 6%)" : isReschedule ? "oklch(0.65 0.15 200 / 5%)" : "oklch(0.18 0.025 250)",
                          borderLeft: `2px solid ${isDone ? "oklch(0.55 0.18 145 / 50%)" : isReschedule ? "oklch(0.65 0.15 200 / 50%)" : "oklch(0.55 0.18 250 / 40%)"}`,
                        }}
                      >
                        {/* Activity type icon */}
                        {!isEditing && iconEl}

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            /* ── Edit mode ── */
                            <div className="space-y-1.5">
                              <textarea
                                value={editingNoteText}
                                onChange={e => setEditingNoteText(e.target.value)}
                                rows={3}
                                autoFocus
                                className="w-full px-2 py-1.5 rounded text-xs outline-none resize-none"
                                style={{
                                  background: "oklch(0.22 0.025 250)",
                                  border: "1px solid oklch(1 0 0 / 18%)",
                                  color: "oklch(0.88 0.005 250)",
                                }}
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleSaveEditNote(note.id)}
                                  disabled={!editingNoteText.trim()}
                                  className="px-2.5 py-1 rounded text-[10px] font-semibold transition-all disabled:opacity-40"
                                  style={{ background: "oklch(0.55 0.18 250 / 20%)", color: "oklch(0.70 0.12 250)", border: "1px solid oklch(0.55 0.18 250 / 30%)" }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-2.5 py-1 rounded text-[10px] transition-all"
                                  style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.50 0.01 250)" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ── View mode ── */
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <span style={{ color: "oklch(0.85 0.005 250)", lineHeight: "1.55", whiteSpace: "pre-wrap" }}>
                                  {commentText}
                                </span>
                                {/* Edit / Delete buttons — visible on hover */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                                  {!isDone && (
                                    <button
                                      onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.text); }}
                                      className="p-1 rounded hover:bg-white/10 transition-colors"
                                      title="Edit note"
                                      style={{ color: "oklch(0.55 0.01 250)" }}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-1 rounded hover:bg-red-500/15 transition-colors"
                                    title="Delete note"
                                    style={{ color: "oklch(0.55 0.01 250)" }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Completion badge */}
                              {isDone && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                    style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}
                                  >
                                    <CheckCheck className="w-2.5 h-2.5" />
                                    Follow-up done · {doneMember} · {doneDate}
                                  </span>
                                </div>
                              )}

                              {/* Reschedule badge */}
                              {isReschedule && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                    style={{ background: "oklch(0.65 0.15 200 / 15%)", color: "oklch(0.65 0.15 200)", border: "1px solid oklch(0.65 0.15 200 / 30%)" }}
                                  >
                                    <Calendar className="w-2.5 h-2.5" />
                                    Rescheduled to {rescheduleNewDate ? formatDate(rescheduleNewDate) : ""} · {rescheduleMember} · {rescheduleOn}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-1.5">
                                {note.authorName && (
                                  <span
                                    className="px-1.5 py-0 rounded-full text-[10px] font-medium"
                                    style={{ background: "oklch(0.55 0.18 250 / 15%)", color: "oklch(0.65 0.12 250)" }}
                                  >
                                    {note.authorName}
                                  </span>
                                )}
                                <span style={{ color: "oklch(0.38 0.01 250)" }}>{formatTimestamp(note.timestamp)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* ══════════════════════════════════════════════════
              SECTION 3 — PAYMENT PLANS (collapsible)
              ══════════════════════════════════════════════════ */}
          {leadId && (
            <div style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
              <button
                onClick={() => setInstallmentsExpanded(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.01 250)" }} />
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "oklch(0.55 0.01 250)" }}
                  >
                    Payment Plans
                  </span>
                </div>
                <ChevronDown
                  className="w-4 h-4 transition-transform"
                  style={{
                    color: "oklch(0.45 0.01 250)",
                    transform: installmentsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {installmentsExpanded && <InstallmentsTab leadId={leadId} />}
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              SECTION 4 — ONBOARDING CHECKLIST (collapsible)
              ══════════════════════════════════════════════════ */}
          {lead.stage === "Onboarding" && leadId && (
            <div style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
              <button
                onClick={() => setOnboardingExpanded(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.18 145)" }} />
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "oklch(0.65 0.18 145)" }}
                  >
                    Onboarding Checklist
                  </span>
                </div>
                <ChevronDown
                  className="w-4 h-4 transition-transform"
                  style={{
                    color: "oklch(0.45 0.01 250)",
                    transform: onboardingExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {onboardingExpanded && (
                <OnboardingTab leadId={leadId} activeMemberName={activeMember?.name ?? "Staff"} />
              )}
            </div>
          )}

        </div>
        {/* end scrollable body */}

      </div>
      {/* end panel */}

      {/* ── Inline Convert to Retained Modal ── */}
      <Dialog open={showInlineConvert} onOpenChange={open => { if (!open) setShowInlineConvert(false); }}>
        <DialogContent style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
              Convert {lead?.name} to Retained
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Total Retainer Amount *</Label>
              <Input
                type="number"
                value={inlineConvertForm.retainerBooked}
                onChange={e => setInlineConvertForm(f => ({ ...f, retainerBooked: e.target.value }))}
                placeholder="e.g. 9000"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Downpayment Received Today</Label>
              <Input
                type="number"
                value={inlineConvertForm.downpayment}
                onChange={e => setInlineConvertForm(f => ({ ...f, downpayment: e.target.value }))}
                placeholder="e.g. 2500"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Case Number</Label>
              <Input
                value={inlineConvertForm.caseNumber}
                onChange={e => setInlineConvertForm(f => ({ ...f, caseNumber: e.target.value }))}
                placeholder={lead?.caseNumber || "e.g. 512"}
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Notes</Label>
              <Textarea
                value={inlineConvertForm.notes}
                onChange={e => setInlineConvertForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={2}
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleInlineConvert} style={{ background: "oklch(0.55 0.18 145)", color: "oklch(0.98 0 0)" }}>
              <CheckCircle className="w-4 h-4 mr-2" /> Confirm Conversion
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowInlineConvert(false)}
              style={{ borderColor: "oklch(1 0 0 / 20%)", color: "oklch(0.65 0.01 250)" }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Follow-Up Modal */}
      {showCompleteModal && lead && (
        <CompleteFollowUpModal
          lead={lead}
          onConfirm={handleCompleteFollowUp}
          onCancel={() => setShowCompleteModal(false)}
        />
      )}

      {/* Reschedule Modal — mandatory reason note when changing an existing date */}
      {showRescheduleModal && lead && pendingRescheduleDate && (
        <RescheduleModal
          lead={lead}
          initialDate={pendingRescheduleDate}
          onConfirm={handleRescheduleConfirm}
          onCancel={() => { setShowRescheduleModal(false); setPendingRescheduleDate(null); }}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// ActivityCard — renders one follow-up with its comments + quick comment input
// ─────────────────────────────────────────────────────────────────────────────
function ActivityCard({
  fu,
  commentText,
  onCommentChange,
  onAddComment,
}: {
  fu: FollowUp;
  commentText: string;
  onCommentChange: (text: string) => void;
  onAddComment: () => void;
}) {
  const statusColor: Record<string, string> = {
    Pending:  "oklch(0.72 0.12 75)",
    Done:     "oklch(0.55 0.18 145)",
    Snoozed:  "oklch(0.55 0.01 250)",
  };
  const color = statusColor[fu.status] ?? "oklch(0.55 0.01 250)";

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "oklch(0.18 0.025 250)",
        border: "1px solid oklch(1 0 0 / 8%)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Task title row */}
      <div className="flex items-center justify-between px-3 py-2.5 gap-2">
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-medium"
            style={{
              color: fu.status === "Done" ? "oklch(0.45 0.01 250)" : "oklch(0.90 0.005 250)",
              textDecoration: fu.status === "Done" ? "line-through" : "none",
            }}
          >
            {fu.title}
          </span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>
              {formatDate(fu.dueDate)}
            </span>
            <span
              className="text-[10px] px-1.5 py-0 rounded font-semibold"
              style={{
                background: `${color}20`,
                color,
              }}
            >
              {fu.status}
            </span>
            {fu.assignedTo && (
              <span
                className="text-xs px-1.5 py-0 rounded-full"
                style={{ background: "oklch(0.55 0.18 250 / 20%)", color: "oklch(0.70 0.12 250)" }}
              >
                {fu.assignedTo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Comments log */}
      {fu.comments.length > 0 && (
        <div className="px-3 pb-2 space-y-1.5">
          {fu.comments.map(c => (
            <div
              key={c.id}
              className="text-xs px-2.5 py-1.5 rounded"
              style={{
                background: "oklch(0.20 0.025 250)",
                borderLeft: "2px solid oklch(0.72 0.12 75 / 30%)",
              }}
            >
              <span style={{ color: "oklch(0.80 0.005 250)" }}>{c.text}</span>
              <span className="ml-2" style={{ color: "oklch(0.38 0.01 250)" }}>
                {formatTimestamp(c.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick comment input */}
      <div className="flex gap-1.5 px-3 pb-2.5">
        <input
          type="text"
          placeholder="Add a comment..."
          value={commentText}
          onChange={e => onCommentChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && commentText.trim()) onAddComment(); }}
          className="flex-1 px-2.5 py-1.5 rounded text-xs outline-none"
          style={{
            background: "oklch(0.20 0.025 250)",
            border: "1px solid oklch(1 0 0 / 10%)",
            color: "oklch(0.85 0.005 250)",
          }}
        />
        {commentText.trim() && (
          <button
            onClick={onAddComment}
            className="px-2.5 py-1.5 rounded text-xs font-medium transition-all hover:opacity-90"
            style={{
              background: "oklch(0.72 0.12 75 / 20%)",
              color: "oklch(0.72 0.12 75)",
              border: "1px solid oklch(0.72 0.12 75 / 30%)",
            }}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
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
  const [formStart, setFormStart] = useState(todayPST());
  const [formNotes, setFormNotes] = useState("");
  const [editingDueDateItemId, setEditingDueDateItemId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const today = todayPST();

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

      {plans.length === 0 && !showForm && (
        <div className="text-center py-10">
          <CreditCard className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.30 0.01 250)" }} />
          <p className="text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>No installment plans yet.</p>
          <p className="text-xs mt-1" style={{ color: "oklch(0.35 0.01 250)" }}>Click "New Installment Plan" to create one.</p>
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
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: outstanding <= 0 ? "oklch(0.55 0.18 145)" : "oklch(0.72 0.12 75)" }} />
                </div>
                <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>{paidCount} of {plan.installmentCount} paid</div>
              </div>
            </div>
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
                      borderLeft: `3px solid ${item.isPaid ? "oklch(0.55 0.18 145)" : isOverdue ? "oklch(0.65 0.22 25)" : isDueToday ? "oklch(0.72 0.15 80)" : "transparent"}`,
                    }}
                  >
                    <button
                      onClick={() => togglePaid.mutate({ id: item.id, isPaid: !item.isPaid, paidDate: !item.isPaid ? today : null })}
                      className="flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all"
                      style={{ background: item.isPaid ? "oklch(0.55 0.18 145)" : "transparent", borderColor: item.isPaid ? "oklch(0.55 0.18 145)" : "oklch(0.40 0.01 250)" }}
                      title={item.isPaid ? "Mark as unpaid" : "Mark as paid"}
                    >
                      {item.isPaid && <Check className="w-3 h-3" style={{ color: "oklch(0.13 0.025 250)" }} />}
                    </button>
                    <span className="text-xs font-mono flex-shrink-0 w-5 text-center" style={{ color: "oklch(0.45 0.01 250)" }}>#{item.installmentNumber}</span>
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
                          {new Date(item.dueDate + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric" })}
                          {isOverdue && <span className="ml-1 text-[10px]">(overdue)</span>}
                          {isDueToday && <span className="ml-1 text-[10px]">(today)</span>}
                        </button>
                      )}
                      {item.isPaid && item.paidDate && (
                        <div className="text-[10px]" style={{ color: "oklch(0.45 0.01 250)" }}>
                          Paid {new Date(item.paidDate + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" })}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: item.isPaid ? "oklch(0.55 0.18 145)" : "oklch(0.72 0.12 75)" }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding Tab — isolated component for onboarding checklist
// ─────────────────────────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { key: "consultation_booked" as const,  label: "Consultation Booked",      description: "Attorney consultation has been scheduled and confirmed with the client" },
  { key: "case_notes_created" as const,   label: "Case Notes Created",        description: "Initial case notes and intake information documented in the system" },
  { key: "task_added_cerenade" as const,  label: "Task Added in Cerenade",    description: "Case task created and assigned in Cerenade case management" },
  { key: "task_added_planner" as const,   label: "Task Added in Planner",     description: "Task added to team planner for workflow tracking" },
];

function OnboardingTab({ leadId, activeMemberName }: { leadId: string; activeMemberName: string }) {
  const utils = trpc.useUtils();
  const { data: checklistData = [], isLoading } = trpc.onboarding.getByLead.useQuery({ leadId });

  const toggleStep = trpc.onboarding.toggleStep.useMutation({
    onSuccess: () => utils.onboarding.getByLead.invalidate({ leadId }),
    onError: () => toast.error("Failed to update step"),
  });

  const completedSteps = new Set(checklistData.filter(c => c.completedAt).map(c => c.step));
  const completedCount = completedSteps.size;
  const allDone = completedCount === 4;

  const handleToggle = (step: typeof ONBOARDING_STEPS[number]["key"]) => {
    const isCompleted = completedSteps.has(step);
    toggleStep.mutate({
      leadId,
      step,
      completedAt: isCompleted ? null : new Date().toISOString(),
      completedBy: isCompleted ? null : activeMemberName,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>Loading checklist…</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>Onboarding Checklist</h3>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>Track onboarding steps for this client</p>
        </div>
        {allDone ? (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 40%)" }}>
            ✓ All Complete
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: "oklch(0.65 0.18 200 / 15%)", color: "oklch(0.65 0.18 200)", border: "1px solid oklch(0.65 0.18 200 / 30%)" }}>
            {completedCount} / 4 done
          </span>
        )}
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / 4) * 100}%`, background: allDone ? "oklch(0.55 0.18 145)" : "oklch(0.65 0.18 200)" }}
        />
      </div>
      <div className="space-y-2">
        {ONBOARDING_STEPS.map(({ key, label, description }) => {
          const done = completedSteps.has(key);
          const stepData = checklistData.find(c => c.step === key && c.completedAt);
          return (
            <button
              key={key}
              onClick={() => handleToggle(key)}
              disabled={toggleStep.isPending}
              className="w-full text-left rounded-lg p-3 transition-all hover:opacity-90 active:scale-[0.99]"
              style={{
                background: done ? "oklch(0.55 0.18 145 / 10%)" : "oklch(0.18 0.025 250)",
                border: `1px solid ${done ? "oklch(0.55 0.18 145 / 30%)" : "oklch(1 0 0 / 8%)"}`,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {done
                    ? <CheckCircle2 className="w-5 h-5" style={{ color: "oklch(0.55 0.18 145)" }} />
                    : <Circle className="w-5 h-5" style={{ color: "oklch(0.35 0.01 250)" }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: done ? "oklch(0.55 0.18 145)" : "oklch(0.82 0.005 250)", textDecoration: done ? "line-through" : "none" }}
                    >
                      {label}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>{description}</p>
                  {done && stepData && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Check className="w-3 h-3" style={{ color: "oklch(0.55 0.18 145)" }} />
                      <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                        Completed by <strong style={{ color: "oklch(0.65 0.01 250)" }}>{stepData.completedBy}</strong>
                        {stepData.completedAt && (
                          <> · {new Date(stepData.completedAt).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric" })}</>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {allDone && (
        <div className="rounded-lg p-3 text-center" style={{ background: "oklch(0.55 0.18 145 / 10%)", border: "1px solid oklch(0.55 0.18 145 / 25%)" }}>
          <p className="text-sm font-semibold" style={{ color: "oklch(0.55 0.18 145)" }}>🎉 Onboarding Complete</p>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>All onboarding steps have been completed for this client.</p>
        </div>
      )}
    </div>
  );
}
