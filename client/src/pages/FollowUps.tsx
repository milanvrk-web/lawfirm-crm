import { todayPST, addDaysPST } from "@/lib/timezone";
/* ============================================================
   Law Firm CRM — Follow-Ups Page
   Design: Dark Luxury Legal — Navy + Gold
   Replicates MS To Do: due dates, team comments with initials,
   status (Pending / Done / Snoozed), per-lead task threads
   ============================================================ */

import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import {
  formatDate,
  type FollowUp,
  type FollowUpStatus,
} from "@/lib/store";
import {
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CalendarClock,
  Phone,
  User,
  Filter,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import LeadDetailPanel from "@/components/LeadDetailPanel";

const STATUS_COLORS: Record<FollowUpStatus, { bg: string; border: string; text: string; label: string }> = {
  Pending: { bg: "oklch(0.72 0.12 75 / 10%)", border: "oklch(0.72 0.12 75 / 35%)", text: "oklch(0.72 0.12 75)", label: "Pending" },
  Done:    { bg: "oklch(0.55 0.18 145 / 10%)", border: "oklch(0.55 0.18 145 / 35%)", text: "oklch(0.70 0.18 145)", label: "Done" },
  Snoozed: { bg: "oklch(0.55 0.01 250 / 15%)", border: "oklch(0.55 0.01 250 / 35%)", text: "oklch(0.65 0.01 250)", label: "Snoozed" },
};

type FilterType = "All" | "Due Today" | "Overdue" | "Pending" | "Done" | "Snoozed";

export default function FollowUps() {
  const { leads, followUps, addFollowUp, updateFollowUp, deleteFollowUp, addFollowUpComment } = useCRM();

  // ── Filters ──────────────────────────────────────────────
  const [filter, setFilter] = useState<FilterType>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Add Follow-Up form ───────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [addLeadSearch, setAddLeadSearch] = useState("");
  const [addLeadId, setAddLeadId] = useState("");
  const [addTitle, setAddTitle] = useState("Call back");
  const [addDueDate, setAddDueDate] = useState(todayPST());

  // ── Comment form per follow-up ───────────────────────────
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  // ── Inline due date editing (MS To Do style) ─────────────
  const [editingDueDateId, setEditingDueDateId] = useState<string | null>(null);

  const today = todayPST();

  // ── Derived data ─────────────────────────────────────────
  const nowMs = Date.now();
  const dueToday = useMemo(() => followUps.filter(f => f.status === "Pending" && f.dueDate === today), [followUps, today]);
  const overdue = useMemo(() => followUps.filter(f => f.status === "Pending" && f.dueDate < today), [followUps, today]);
  const pending = useMemo(() => followUps.filter(f => f.status === "Pending"), [followUps]);

  // True >24h escalation: dueDate is at least 1 full day in the past
  const isEscalated = (fu: FollowUp) => {
    if (fu.status !== "Pending") return false;
    const dueMs = new Date(fu.dueDate + "T23:59:59").getTime();
    return nowMs - dueMs > 24 * 60 * 60 * 1000;
  };

  const filteredFollowUps = useMemo(() => {
    let list = [...followUps];
    if (filter === "Due Today") list = dueToday;
    else if (filter === "Overdue") list = overdue;
    else if (filter === "Pending") list = pending;
    else if (filter === "Done") list = list.filter(f => f.status === "Done");
    else if (filter === "Snoozed") list = list.filter(f => f.status === "Snoozed");
    // Sort: Escalated (>24h overdue) first, then overdue, then due today, then future, Done last
    return list.sort((a, b) => {
      if (a.status === "Done" && b.status !== "Done") return 1;
      if (b.status === "Done" && a.status !== "Done") return -1;
      const aEsc = isEscalated(a) ? 0 : 1;
      const bEsc = isEscalated(b) ? 0 : 1;
      if (aEsc !== bEsc) return aEsc - bEsc;
      return a.dueDate.localeCompare(b.dueDate);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUps, filter, dueToday, overdue, pending, nowMs]);

  const leadOptions = useMemo(() =>
    leads.filter(l =>
      l.name.toLowerCase().includes(addLeadSearch.toLowerCase()) ||
      (l.phone && l.phone.includes(addLeadSearch))
    ).slice(0, 8),
    [leads, addLeadSearch]
  );

  // ── Helpers ──────────────────────────────────────────────
  const getLeadForFollowUp = (fu: FollowUp) =>
    leads.find(l => l.id === fu.leadId);

  const getDueBadge = (fu: FollowUp) => {
    if (fu.status !== "Pending") return null;
    if (isEscalated(fu)) return { label: "ESCALATED", color: "oklch(0.65 0.25 20)" };
    if (fu.dueDate < today) return { label: "OVERDUE", color: "oklch(0.70 0.22 25)" };
    if (fu.dueDate === today) return { label: "DUE TODAY", color: "oklch(0.72 0.12 75)" };
    return null;
  };

  const handleAddFollowUp = () => {
    if (!addLeadId) { toast.error("Please select a lead"); return; }
    if (!addTitle.trim()) { toast.error("Please enter a task title"); return; }
    if (!addDueDate) { toast.error("Please set a due date"); return; }
    addFollowUp({ leadId: addLeadId, dueDate: addDueDate, status: "Pending", title: addTitle.trim() });
    setAddLeadId("");
    setAddLeadSearch("");
    setAddTitle("Call back");
    setAddDueDate(todayPST());
    setShowAddForm(false);
    toast.success("Follow-up task added");
  };

  const handleAddComment = (fuId: string) => {
    const text = (commentText[fuId] || "").trim();
    if (!text) { toast.error("Type a comment first"); return; }
    addFollowUpComment(fuId, "", text);
    setCommentText(prev => ({ ...prev, [fuId]: "" }));
    toast.success("Comment added");
  };

  const handleStatusCycle = (fu: FollowUp) => {
    const next: Record<FollowUpStatus, FollowUpStatus> = {
      Pending: "Done",
      Done: "Snoozed",
      Snoozed: "Pending",
    };
    updateFollowUp(fu.id, { status: next[fu.status] });
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
  };

  // Weekly Digest: next 7 days grouped by day
  const weeklyDigest = useMemo(() => {
    const days: { dateStr: string; label: string; items: FollowUp[] }[] = [];
    const todayStr = todayPST();
    for (let i = 0; i < 7; i++) {
      const dateStr = addDaysPST(todayStr, i);
      const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" :
        new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "short", day: "numeric" });
      const items = followUps.filter(f => f.status === "Pending" && f.dueDate === dateStr);
      days.push({ dateStr, label, items });
    }
    return days;
  }, [followUps]);

  const [showWeeklyDigest, setShowWeeklyDigest] = useState(false);

  const filterButtons: FilterType[] = ["All", "Due Today", "Overdue", "Pending", "Done", "Snoozed"];
  const filterCounts: Record<FilterType, number> = {
    All: followUps.length,
    "Due Today": dueToday.length,
    Overdue: overdue.length,
    Pending: pending.length,
    Done: followUps.filter(f => f.status === "Done").length,
    Snoozed: followUps.filter(f => f.status === "Snoozed").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
            Follow-Ups
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
            {pending.length} pending · {dueToday.length} due today · {overdue.length} overdue
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}
        >
          <Plus className="w-4 h-4" />
          Add Follow-Up
        </button>
      </div>

      {/* ── Summary Badges ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Due Today", count: dueToday.length, color: "oklch(0.72 0.12 75)", icon: Bell },
          { label: "Overdue", count: overdue.length, color: "oklch(0.70 0.22 25)", icon: AlertCircle },
          { label: "Pending", count: pending.length, color: "oklch(0.60 0.15 250)", icon: Clock },
          { label: "Done", count: filterCounts.Done, color: "oklch(0.70 0.18 145)", icon: CheckCircle2 },
        ].map(({ label, count, color, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg p-4 border cursor-pointer transition-all hover:opacity-90"
            style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}
            onClick={() => setFilter(label as FilterType)}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(0.55 0.01 250)" }}>{label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color }}>{count}</div>
          </div>
        ))}
      </div>

      {/* ── Add Follow-Up Form ───────────────────────────────── */}
      {showAddForm && (
        <div className="rounded-xl border p-5 space-y-4" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 30%)" }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
            New Follow-Up Task
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Lead search */}
            <div className="space-y-1 relative">
              <label className="text-xs font-medium" style={{ color: "oklch(0.65 0.01 250)" }}>Lead / Client *</label>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={addLeadId ? (leads.find(l => l.id === addLeadId)?.name || addLeadSearch) : addLeadSearch}
                onChange={e => { setAddLeadSearch(e.target.value); setAddLeadId(""); }}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)", color: "oklch(0.90 0.005 250)" }}
              />
              {addLeadSearch && !addLeadId && leadOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-lg border overflow-hidden shadow-xl"
                  style={{ background: "oklch(0.20 0.03 250)", borderColor: "oklch(1 0 0 / 15%)" }}>
                  {leadOptions.map(l => (
                    <button
                      key={l.id}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                      style={{ color: "oklch(0.85 0.005 250)" }}
                      onClick={() => { setAddLeadId(l.id); setAddLeadSearch(l.name); }}
                    >
                      <span>{l.name}</span>
                      {l.phone && <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>{l.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Task title */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "oklch(0.65 0.01 250)" }}>Task *</label>
              <input
                type="text"
                placeholder="e.g. Call back, Send documents..."
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)", color: "oklch(0.90 0.005 250)" }}
              />
            </div>
            {/* Due date */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: "oklch(0.65 0.01 250)" }}>Due Date *</label>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>Today (PST): {todayPST()}</span>
              </div>
              <input
                type="date"
                value={addDueDate}
                onChange={e => setAddDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)", color: "oklch(0.90 0.005 250)", colorScheme: "dark" }}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleAddFollowUp}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}
            >
              Add Task
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
              style={{ color: "oklch(0.55 0.01 250)", border: "1px solid oklch(1 0 0 / 10%)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Weekly Digest Panel ────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 25%)" }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3 cursor-pointer"
          onClick={() => setShowWeeklyDigest(v => !v)}
          style={{ color: "oklch(0.72 0.12 75)" }}
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">7-Day Digest</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>
              {weeklyDigest.reduce((s, d) => s + d.items.length, 0)} tasks
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showWeeklyDigest ? "rotate-180" : ""}`} />
        </button>
        {showWeeklyDigest && (
          <div className="px-5 pb-4 space-y-3" style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 pt-3">
              {weeklyDigest.map(({ dateStr, label, items }) => {
                const isToday = dateStr === today;
                const doneCount = followUps.filter(f => f.dueDate === dateStr && f.status === "Done").length;
                const totalCount = followUps.filter(f => f.dueDate === dateStr).length;
                return (
                  <div
                    key={dateStr}
                    className="rounded-lg p-3"
                    style={{
                      background: isToday ? "oklch(0.72 0.12 75 / 10%)" : items.length > 0 ? "oklch(0.72 0.12 75 / 4%)" : "oklch(0.16 0.025 250)",
                      border: isToday ? "2px solid oklch(0.72 0.12 75 / 70%)" : `1px solid ${items.length > 0 ? "oklch(0.72 0.12 75 / 20%)" : "oklch(1 0 0 / 6%)"}`,
                    }}
                  >
                    <div className="text-xs font-semibold mb-1" style={{ color: isToday ? "oklch(0.72 0.12 75)" : "oklch(0.65 0.01 250)" }}>
                      {label}
                    </div>
                    {totalCount > 0 && (
                      <div className="text-xs mb-2" style={{ color: "oklch(0.50 0.01 250)" }}>
                        {doneCount}/{totalCount} done
                      </div>
                    )}
                    {items.length === 0 ? (
                      <div className="text-xs" style={{ color: "oklch(0.35 0.01 250)" }}>Free</div>
                    ) : (
                      <div className="space-y-1">
                        {items.map(fu => {
                          const lead = leads.find(l => l.id === fu.leadId);
                          return (
                            <div key={fu.id} className="text-xs" style={{ color: "oklch(0.80 0.005 250)" }}>
                              <div className="font-medium truncate">{fu.title}</div>
                              {lead && <div className="truncate" style={{ color: "oklch(0.55 0.01 250)" }}>{lead.name}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {items.length > 0 && (
                      <div className="mt-2 text-xs font-bold" style={{ color: "oklch(0.72 0.12 75)" }}>{items.length} pending</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        <Filter className="w-3.5 h-3.5 mr-1" style={{ color: "oklch(0.55 0.01 250)" }} />
        {filterButtons.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === f ? "oklch(0.72 0.12 75 / 15%)" : "transparent",
              border: `1px solid ${filter === f ? "oklch(0.72 0.12 75 / 50%)" : "oklch(1 0 0 / 8%)"}`,
              color: filter === f ? "oklch(0.72 0.12 75)" : "oklch(0.55 0.01 250)",
            }}
          >
            {f} {filterCounts[f] > 0 && <span className="ml-1 opacity-70">({filterCounts[f]})</span>}
          </button>
        ))}
      </div>

      {/* ── Follow-Up List ───────────────────────────────────── */}
      {filteredFollowUps.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
          <CalendarClock className="w-10 h-10 mx-auto mb-3" style={{ color: "oklch(0.35 0.01 250)" }} />
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>
            {filter === "All" ? "No follow-up tasks yet. Click \"Add Follow-Up\" to create one." : `No ${filter.toLowerCase()} tasks.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFollowUps.map(fu => {
            const lead = getLeadForFollowUp(fu);
            const badge = getDueBadge(fu);
            const sc = STATUS_COLORS[fu.status];
            const isExpanded = expandedId === fu.id;
            const myText = commentText[fu.id] || "";

            return (
              <div
                key={fu.id}
                className="rounded-xl border transition-all"
                style={{
                  background: "oklch(0.18 0.025 250)",
                  borderColor: badge?.color ? `${badge.color} / 30%` : "oklch(1 0 0 / 8%)",
                  borderLeftColor: badge?.color || sc.border,
                  borderLeftWidth: "3px",
                }}
              >
                {/* ── Task Row ── */}
                <div className="flex items-start gap-3 p-4">
                  {/* Status toggle button */}
                  <button
                    onClick={() => handleStatusCycle(fu)}
                    className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                    title={`Status: ${fu.status} — click to cycle`}
                  >
                    {fu.status === "Done"
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: "oklch(0.70 0.18 145)" }} />
                      : fu.status === "Snoozed"
                      ? <Clock className="w-5 h-5" style={{ color: "oklch(0.65 0.01 250)" }} />
                      : <Circle className="w-5 h-5" style={{ color: "oklch(0.72 0.12 75)" }} />
                    }
                  </button>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className="font-medium text-sm text-left hover:underline transition-colors group flex items-center gap-1"
                        style={{
                          color: fu.status === "Done" ? "oklch(0.50 0.01 250)" : "oklch(0.90 0.005 250)",
                          textDecoration: fu.status === "Done" ? "line-through" : "none",
                        }}
                        onClick={() => lead && setSelectedLeadId(lead.id)}
                        title="Open lead detail panel"
                      >
                        {fu.title}
                        {lead && <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" style={{ textDecoration: "none" }} />}
                      </button>
                      {badge && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${badge.color} / 15%`, color: badge.color }}>
                          {badge.label}
                        </span>
                      )}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                      >
                        {sc.label}
                      </span>
                    </div>

                    {/* Lead info */}
                    {lead && (
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3" style={{ color: "oklch(0.55 0.01 250)" }} />
                          <button
                            className="text-xs font-medium hover:underline transition-colors"
                            style={{ color: "oklch(0.72 0.12 75)" }}
                            onClick={(e) => { e.stopPropagation(); setSelectedLeadId(lead.id); }}
                            title="Open lead detail panel"
                          >
                            {lead.name}
                          </button>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" style={{ color: "oklch(0.55 0.01 250)" }} />
                            <a
                              href={`tel:${lead.phone}`}
                              className="text-xs hover:underline"
                              style={{ color: "oklch(0.65 0.01 250)" }}
                            >
                              {lead.phone}
                            </a>
                          </div>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.55 0.01 250)" }}>
                          {lead.caseType} · {lead.stage}
                        </span>
                      </div>
                    )}

                    {/* Due date + comment count */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" style={{ color: "oklch(0.55 0.01 250)" }} />
                        {editingDueDateId === fu.id ? (
                          <input
                            type="date"
                            defaultValue={fu.dueDate}
                            autoFocus
                            className="text-xs px-1.5 py-0.5 rounded outline-none"
                            style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 60%)", color: "oklch(0.90 0.005 250)", colorScheme: "dark" }}
                            onChange={e => {
                              if (e.target.value) {
                                updateFollowUp(fu.id, { dueDate: e.target.value });
                                setEditingDueDateId(null);
                                toast.success("Due date updated");
                              }
                            }}
                            onBlur={() => setEditingDueDateId(null)}
                            onKeyDown={e => { if (e.key === "Escape") setEditingDueDateId(null); }}
                          />
                        ) : (
                          <button
                            className="text-xs flex items-center gap-1 px-1.5 py-0.5 rounded transition-all hover:bg-white/8 group"
                            style={{ color: fu.dueDate < today && fu.status === "Pending" ? "oklch(0.70 0.22 25)" : fu.dueDate === today && fu.status === "Pending" ? "oklch(0.72 0.12 75)" : "oklch(0.55 0.01 250)" }}
                            onClick={() => setEditingDueDateId(fu.id)}
                            title="Click to change due date"
                          >
                            Due {formatDate(fu.dueDate)}
                            <span className="opacity-0 group-hover:opacity-60 text-xs transition-opacity" style={{ fontSize: "10px" }}>✎</span>
                          </button>
                        )}
                        {fu.assignedTo && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "oklch(0.55 0.18 250 / 20%)", color: "oklch(0.70 0.12 250)" }}>
                            {fu.assignedTo}
                          </span>
                        )}
                      </div>
                      {fu.comments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" style={{ color: "oklch(0.55 0.01 250)" }} />
                          <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                            {fu.comments.length} note{fu.comments.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : fu.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                      style={{ color: "oklch(0.55 0.01 250)" }}
                      title="View / add notes"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { deleteFollowUp(fu.id); toast.success("Task deleted"); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: "oklch(0.55 0.01 250)" }}
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Expanded: Comment Thread ── */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                    {/* Existing comments */}
                    {fu.comments.length > 0 ? (
                      <div className="space-y-2">
                        {fu.comments.map(c => (
                          <div key={c.id} className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs" style={{ color: "oklch(0.85 0.005 250)" }}>{c.text}</span>
                              <span className="text-xs ml-2" style={{ color: "oklch(0.40 0.01 250)" }}>{formatTimestamp(c.timestamp)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: "oklch(0.40 0.01 250)" }}>No notes yet. Add the first one below.</p>
                    )}

                    {/* Add comment */}
                    <div className="space-y-2">

                      {/* Comment input row */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. M: called lead, no answer..."
                          value={myText}
                          onChange={e => setCommentText(prev => ({ ...prev, [fu.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter") handleAddComment(fu.id); }}
                          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)", color: "oklch(0.90 0.005 250)" }}
                        />
                        <button
                          onClick={() => handleAddComment(fu.id)}
                          className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                          style={{ background: "oklch(0.72 0.12 75 / 20%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 35%)" }}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Status change buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>Mark as:</span>
                      {(["Pending", "Done", "Snoozed"] as FollowUpStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => updateFollowUp(fu.id, { status: s })}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: fu.status === s ? STATUS_COLORS[s].bg : "transparent",
                            border: `1px solid ${fu.status === s ? STATUS_COLORS[s].border : "oklch(1 0 0 / 10%)"}`,
                            color: fu.status === s ? STATUS_COLORS[s].text : "oklch(0.55 0.01 250)",
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* ── Lead Detail Panel (shared component) ─────────────── */}
      {selectedLeadId && (
        <LeadDetailPanel
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}

    </div>
  );
}