/* ============================================================
   Law Firm CRM — Follow-Ups Page  (v3 — mandatory complete flow)
   Design: Dark Luxury Legal — Navy + Gold

   Model: Every lead has ONE follow-up date + a running activity
   thread (lead notes). Marking a follow-up done requires BOTH
   a closing note AND the next follow-up date — mandatory, no skip.
   ============================================================ */

import { useState, useMemo, useRef, useEffect } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { trpc } from "@/lib/trpc";
import { formatDate, type Lead } from "@/lib/store";
import { todayPST, addDaysPST, nowDateTimePST } from "@/lib/timezone";
import { useActiveMember } from "@/contexts/ActiveMemberContext";
import {
  Bell, AlertCircle, CheckCircle2, Calendar,
  Phone, MessageSquare, ChevronRight, X, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PSTDatePicker } from "@/components/PSTDatePicker";
import LeadDetailPanel from "@/components/LeadDetailPanel";

// ── Helpers ────────────────────────────────────────────────

function getDueBadge(followUpDate: string, today: string) {
  if (followUpDate < today) return { label: "OVERDUE", color: "oklch(0.70 0.22 25)", bg: "oklch(0.70 0.22 25 / 12%)" };
  if (followUpDate === today) return { label: "TODAY", color: "oklch(0.72 0.12 75)", bg: "oklch(0.72 0.12 75 / 12%)" };
  const diff = Math.ceil((new Date(followUpDate + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime()) / 86400000);
  if (diff === 1) return { label: "TOMORROW", color: "oklch(0.65 0.15 200)", bg: "oklch(0.65 0.15 200 / 12%)" };
  return { label: formatDate(followUpDate), color: "oklch(0.55 0.01 250)", bg: "oklch(0.55 0.01 250 / 10%)" };
}

const stageColor: Record<string, string> = {
  "New Lead":     "oklch(0.55 0.18 250)",
  "Consultation": "oklch(0.72 0.15 80)",
  "Follow-Up":    "oklch(0.65 0.15 60)",
  "Retained":     "oklch(0.55 0.18 145)",
  "Onboarding":   "oklch(0.55 0.18 200)",
  "Lost":         "oklch(0.60 0.22 25)",
};

// ── Complete Follow-Up Modal ───────────────────────────────

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

  const getQuickDate = (days: number) => addDaysPST(todayPST(), days);

  const QUICK_PICKS = [
    { label: "Tomorrow", days: 1 },
    { label: "3 Days",   days: 3 },
    { label: "1 Week",   days: 7 },
    { label: "2 Weeks",  days: 14 },
    { label: "1 Month",  days: 30 },
    { label: "2 Months", days: 60 },
  ];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
            placeholder='e.g. "Spoke with client — sending retainer agreement", "No answer, left voicemail", "Client retained today"'
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
          {/* Quick-pick chips */}
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
          {/* Custom date picker — PST-safe, no native input */}
          <PSTDatePicker
            value={nextDate}
            onChange={setNextDate}
            minDate={today}
            inline
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
            Complete & Set Next Date
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

// ── Reschedule Modal (mandatory reason note) ─────────────

function RescheduleModal({
  lead,
  onConfirm,
  onCancel,
}: {
  lead: Lead;
  onConfirm: (note: string, newDate: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [newDate, setNewDate] = useState("");
  const today = todayPST();
  const canSubmit = note.trim().length > 0 && newDate.length > 0;

  const getQuickDate = (days: number) => addDaysPST(todayPST(), days);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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

        {/* Field 1: Reason note (mandatory) */}
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

        {/* Field 2: New date (mandatory) */}
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
          {/* PST-safe date picker */}
          <PSTDatePicker
            value={newDate}
            onChange={setNewDate}
            minDate={today}
            inline
          />
          {!newDate && (
            <p className="text-[10px] mt-1" style={{ color: "oklch(0.50 0.01 250)" }}>Required — set the new follow-up date</p>
          )}
        </div>

        {/* Actions */}
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

// ── Component ──────────────────────────────────────────────

export default function FollowUps() {
  const { leads, setLeadFollowUpDate, addLeadNote } = useCRM();
  const { activeMember } = useActiveMember();
  const today = todayPST();

  const [panelLeadId, setPanelLeadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | "Overdue" | "Today" | "Upcoming">("All");
  const [memberFilter, setMemberFilter] = useState<string>("All");
  const [completingLead, setCompletingLead] = useState<Lead | null>(null);
  const [reschedulingLead, setReschedulingLead] = useState<Lead | null>(null);

  // Fetch team members for the member filter
  const { data: members = [] } = trpc.members.list.useQuery();

  // Leads with a follow-up date set
  const leadsWithFollowUp = useMemo(() =>
    leads.filter(l => l.followUpDate),
    [leads]
  );

  // Derived counts
  const overdueLeads  = useMemo(() => leadsWithFollowUp.filter(l => l.followUpDate! < today), [leadsWithFollowUp, today]);
  const todayLeads    = useMemo(() => leadsWithFollowUp.filter(l => l.followUpDate === today), [leadsWithFollowUp, today]);
  const upcomingLeads = useMemo(() => leadsWithFollowUp.filter(l => l.followUpDate! > today), [leadsWithFollowUp, today]);

  // Filtered + sorted list (with member filter)
  const filteredLeads = useMemo(() => {
    let list: Lead[];
    if (filter === "Overdue")  list = overdueLeads;
    else if (filter === "Today")    list = todayLeads;
    else if (filter === "Upcoming") list = upcomingLeads;
    else list = leadsWithFollowUp;
    if (memberFilter !== "All") list = list.filter(l => l.assignedTo === memberFilter);
    return [...list].sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!));
  }, [filter, memberFilter, leadsWithFollowUp, overdueLeads, todayLeads, upcomingLeads]);

  const handleMarkDoneClick = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletingLead(lead);
  };

  const handleCompleteConfirm = async (note: string, nextDate: string) => {
    if (!completingLead) return;
    const lead = completingLead;
    setCompletingLead(null);

    const completedOn = nowDateTimePST();
    const memberName = activeMember ? activeMember.name : "Team";

    // Save ONE combined note: comment + __DONE__ tag (same format as LeadDetailPanel)
    const combinedNote = `${note}\n__DONE__:${memberName}:${completedOn}`;
    await addLeadNote(lead.id, combinedNote, activeMember?.name ?? undefined);

    // Set the next follow-up date
    await setLeadFollowUpDate(lead.id, nextDate);

    toast.success(`Follow-up done for ${lead.name} · Next: ${formatDate(nextDate)}`);
  };

  // For leads with NO existing date, set directly (first-time set, no note required)
  // For leads that ALREADY have a date, open the reschedule modal to force a reason note
  const handleSetDate = (lead: Lead, _date: string) => {
    if (lead.followUpDate) {
      // Already has a date — require a reason note before changing it
      setReschedulingLead(lead);
    } else {
      // No date yet — allow direct set without note
      setLeadFollowUpDate(lead.id, _date);
      toast.success(`Follow-up set to ${formatDate(_date)}`);
    }
  };

  const handleRescheduleConfirm = async (note: string, newDate: string) => {
    if (!reschedulingLead) return;
    const lead = reschedulingLead;
    setReschedulingLead(null);

    const memberName = activeMember?.name ?? "Team";
    const rescheduledOn = nowDateTimePST();

    // Log a traceable activity entry: reason + reschedule tag
    const auditNote = `${note}\n__RESCHEDULE__:${memberName}:${rescheduledOn}:${newDate}`;
    await addLeadNote(lead.id, auditNote, activeMember?.name ?? undefined);

    // Update the follow-up date
    await setLeadFollowUpDate(lead.id, newDate);

    toast.success(`Rescheduled to ${formatDate(newDate)} — reason logged`);
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">

      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}
        >
          Follow-Ups
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
          {overdueLeads.length > 0 && (
            <span style={{ color: "oklch(0.70 0.22 25)" }}>{overdueLeads.length} overdue · </span>
          )}
          {todayLeads.length} due today · {upcomingLeads.length} upcoming
        </p>
      </div>

      {/* ── Summary Badges ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "All",      label: "All",      count: leadsWithFollowUp.length, color: "oklch(0.60 0.15 250)", icon: Calendar },
          { key: "Overdue",  label: "Overdue",  count: overdueLeads.length,      color: "oklch(0.70 0.22 25)",  icon: AlertCircle },
          { key: "Today",    label: "Today",    count: todayLeads.length,         color: "oklch(0.72 0.12 75)",  icon: Bell },
          { key: "Upcoming", label: "Upcoming", count: upcomingLeads.length,      color: "oklch(0.55 0.18 145)", icon: Calendar },
        ].map(({ key, label, count, color, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className="rounded-lg p-3.5 border text-left transition-all hover:opacity-90"
            style={{
              background: filter === key ? `${color.replace(")", " / 15%)")}` : "oklch(0.17 0.025 250)",
              borderColor: filter === key ? color : "oklch(1 0 0 / 8%)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-xs font-semibold" style={{ color }}>{label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "oklch(0.93 0.005 250)" }}>{count}</div>
          </button>
        ))}
      </div>

      {/* ── Member Filter Chips ─────────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>Assigned to:</span>
          {["All", ...members.map((m: { name: string }) => m.name)].map(name => (
            <button
              key={name}
              onClick={() => setMemberFilter(name)}
              className="text-xs px-2.5 py-1 rounded-full transition-all"
              style={{
                background: memberFilter === name ? "oklch(0.55 0.18 250 / 25%)" : "oklch(0.20 0.025 250)",
                color: memberFilter === name ? "oklch(0.72 0.12 250)" : "oklch(0.55 0.01 250)",
                border: memberFilter === name ? "1px solid oklch(0.55 0.18 250 / 50%)" : "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* ── Lead List ─────────────────────────────────────────────────── */}
      {filteredLeads.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: "oklch(0.17 0.025 250)", border: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "oklch(0.55 0.18 145)" }} />
          <p className="text-base font-semibold" style={{ color: "oklch(0.70 0.005 250)" }}>
            {filter === "All" ? "No follow-ups scheduled" : `No ${filter.toLowerCase()} follow-ups`}
          </p>
          <p className="text-sm mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>
            Open a lead and set a follow-up date to add it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLeads.map(lead => {
            const badge = getDueBadge(lead.followUpDate!, today);
            return (
              <LeadFollowUpRow
                key={lead.id}
                lead={lead}
                badge={badge}
                stageColor={stageColor[lead.stage] ?? "oklch(0.55 0.01 250)"}
                onOpen={() => setPanelLeadId(lead.id)}
                onMarkDone={handleMarkDoneClick}
                onSetDate={handleSetDate}
              />
            );
          })}
        </div>
      )}

      {/* ── Complete Follow-Up Modal ─────────────────────────── */}
      {completingLead && (
        <CompleteFollowUpModal
          lead={completingLead}
          onConfirm={handleCompleteConfirm}
          onCancel={() => setCompletingLead(null)}
        />
      )}

      {/* ── Reschedule Modal (mandatory reason note) ─────────── */}
      {reschedulingLead && (
        <RescheduleModal
          lead={reschedulingLead}
          onConfirm={handleRescheduleConfirm}
          onCancel={() => setReschedulingLead(null)}
        />
      )}

      {/* ── Detail Panel ────────────────────────────────────── */}
      {panelLeadId && (
        <LeadDetailPanel
          leadId={panelLeadId}
          onClose={() => setPanelLeadId(null)}
        />
      )}
    </div>
  );
}

// ── LeadFollowUpRow ────────────────────────────────────────

function LeadFollowUpRow({
  lead,
  badge,
  stageColor,
  onOpen,
  onMarkDone,
  onSetDate,
}: {
  lead: Lead;
  badge: { label: string; color: string; bg: string };
  stageColor: string;
  onOpen: () => void;
  onMarkDone: (lead: Lead, e: React.MouseEvent) => void;
  onSetDate: (lead: Lead, date: string) => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInput, setDateInput] = useState(lead.followUpDate ?? "");
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showDatePicker) return;
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDatePicker]);

  // Fetch latest note for preview
  const { data: notes = [] } = trpc.leads.getNotes.useQuery(
    { leadId: lead.id },
    { staleTime: 30_000 }
  );
  const latestNote = useMemo(() =>
    [...notes].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0],
    [notes]
  );

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
  };

  const handleDateConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dateInput) return;
    onSetDate(lead, dateInput);
    setShowDatePicker(false);
  };

  return (
    <div
      className="rounded-xl cursor-pointer transition-all hover:opacity-95 active:scale-[0.995]"
      style={{
        background: "oklch(0.17 0.025 250)",
        border: "1px solid oklch(1 0 0 / 8%)",
        borderLeft: `3px solid ${badge.color}`,
      }}
      onClick={onOpen}
    >
      <div className="flex items-start gap-3 px-4 py-3">

        {/* Left: name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>
              {lead.name}
            </span>
            <span
              className="text-[10px] px-1.5 py-0 rounded font-semibold"
              style={{ background: `${stageColor.replace(")", " / 15%)")}`, color: stageColor }}
            >
              {lead.stage}
            </span>
            <span
              className="text-[10px] px-1.5 py-0 rounded font-bold"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          </div>

          {/* Phone + case type + assignee */}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {lead.phone && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                <Phone className="w-3 h-3" />
                {lead.phone}
              </span>
            )}
            <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{lead.caseType}</span>
            {lead.assignedTo && (
              <span
                className="text-[10px] font-medium px-1.5 py-0 rounded-full"
                style={{ background: "oklch(0.55 0.18 250 / 18%)", color: "oklch(0.72 0.12 250)", border: "1px solid oklch(0.55 0.18 250 / 35%)" }}
              >
                {lead.assignedTo}
              </span>
            )}
          </div>

          {/* Latest activity note preview */}
          {latestNote ? (
            <div className="mt-1.5 flex items-start gap-1.5">
              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "oklch(0.40 0.01 250)" }} />
              <span className="text-xs leading-relaxed line-clamp-2" style={{ color: "oklch(0.60 0.005 250)" }}>
                {latestNote.text}
                <span className="ml-1.5" style={{ color: "oklch(0.38 0.01 250)" }}>
                  — {formatTimestamp(latestNote.timestamp)}
                  {latestNote.authorName && ` · ${latestNote.authorName}`}
                </span>
              </span>
            </div>
          ) : (
            <p className="text-xs mt-1 italic" style={{ color: "oklch(0.35 0.01 250)" }}>
              No activity logged yet
            </p>
          )}
        </div>

        {/* Right: quick actions + chevron */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5 relative">

          {/* Date picker trigger */}
          <div ref={datePickerRef} className="relative">
            <button
              onClick={e => { e.stopPropagation(); setDateInput(lead.followUpDate ?? ""); setShowDatePicker(p => !p); }}
              title="Set follow-up date"
              className="p-1.5 rounded hover:bg-white/8 transition-colors flex items-center gap-1"
              style={{ color: "oklch(0.65 0.15 200)" }}
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>

            {showDatePicker && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-2xl p-3 min-w-[220px]"
                style={{ background: "oklch(0.18 0.025 250)", border: "1px solid oklch(1 0 0 / 14%)" }}
                onClick={e => e.stopPropagation()}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.72 0.12 75)" }}>
                  Set next follow-up date
                </p>
                {/* PST-safe inline calendar — no native date input, no timezone shift */}
                <PSTDatePicker
                  value={dateInput}
                  onChange={setDateInput}
                  inline
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDateConfirm}
                    disabled={!dateInput}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                    style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setShowDatePicker(false); }}
                    className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                    style={{ background: "oklch(0.25 0.025 250)", color: "oklch(0.55 0.01 250)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mark done — opens Complete Follow-Up modal */}
          <button
            onClick={e => onMarkDone(lead, e)}
            title="Complete follow-up"
            className="p-1.5 rounded hover:bg-white/8 transition-colors"
            style={{ color: "oklch(0.55 0.18 145)" }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>

          <ChevronRight className="w-4 h-4" style={{ color: "oklch(0.35 0.01 250)" }} />
        </div>
      </div>
    </div>
  );
}
