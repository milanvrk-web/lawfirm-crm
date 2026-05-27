/* ============================================================
   Law Firm CRM — Follow-Ups Page  (v2 — simple, outcome-based)
   Design: Dark Luxury Legal — Navy + Gold

   Model: Every lead has ONE follow-up date + a running activity
   thread (lead notes). This page shows all leads that have a
   follow-up date set, sorted by date (overdue first, then today,
   then upcoming). Staff click a lead to open the detail panel,
   log a note, and push the date forward. No separate task records.
   ============================================================ */

import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { trpc } from "@/lib/trpc";
import { formatDate, type Lead } from "@/lib/store";
import { todayPST, tomorrowPST } from "@/lib/timezone";
import {
  Bell, AlertCircle, Clock, CheckCircle2, Calendar,
  Phone, MessageSquare, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
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

// ── Component ──────────────────────────────────────────────

export default function FollowUps() {
  const { leads, setLeadFollowUpDate } = useCRM();
  const today = todayPST();
  const tomorrow = tomorrowPST();

  const [panelLeadId, setPanelLeadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | "Overdue" | "Today" | "Upcoming">("All");

  // Leads with a follow-up date set
  const leadsWithFollowUp = useMemo(() =>
    leads.filter(l => l.followUpDate),
    [leads]
  );

  // Derived counts
  const overdueLeads  = useMemo(() => leadsWithFollowUp.filter(l => l.followUpDate! < today), [leadsWithFollowUp, today]);
  const todayLeads    = useMemo(() => leadsWithFollowUp.filter(l => l.followUpDate === today), [leadsWithFollowUp, today]);
  const upcomingLeads = useMemo(() => leadsWithFollowUp.filter(l => l.followUpDate! > today), [leadsWithFollowUp, today]);

  // Filtered + sorted list
  const filteredLeads = useMemo(() => {
    let list: Lead[];
    if (filter === "Overdue")  list = overdueLeads;
    else if (filter === "Today")    list = todayLeads;
    else if (filter === "Upcoming") list = upcomingLeads;
    else list = leadsWithFollowUp;
    // Sort: overdue first, then today, then upcoming
    return [...list].sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!));
  }, [filter, leadsWithFollowUp, overdueLeads, todayLeads, upcomingLeads]);

  const handleMarkDone = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    await setLeadFollowUpDate(lead.id, null);
    toast.success(`Follow-up cleared for ${lead.name}`);
  };

  const handleSnooze = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    await setLeadFollowUpDate(lead.id, tomorrow);
    toast.success(`Snoozed to tomorrow`);
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
          { key: "Upcoming", label: "Upcoming", count: upcomingLeads.length,      color: "oklch(0.55 0.18 145)", icon: Clock },
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

      {/* ── Lead List ───────────────────────────────────────── */}
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
                onMarkDone={handleMarkDone}
                onSnooze={handleSnooze}
              />
            );
          })}
        </div>
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
  onSnooze,
}: {
  lead: Lead;
  badge: { label: string; color: string; bg: string };
  stageColor: string;
  onOpen: () => void;
  onMarkDone: (lead: Lead, e: React.MouseEvent) => void;
  onSnooze: (lead: Lead, e: React.MouseEvent) => void;
}) {
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
            <span
              className="text-sm font-semibold"
              style={{ color: "oklch(0.93 0.005 250)" }}
            >
              {lead.name}
            </span>
            {/* Stage badge */}
            <span
              className="text-[10px] px-1.5 py-0 rounded font-semibold"
              style={{ background: `${stageColor.replace(")", " / 15%)")}`, color: stageColor }}
            >
              {lead.stage}
            </span>
            {/* Due badge */}
            <span
              className="text-[10px] px-1.5 py-0 rounded font-bold"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          </div>

          {/* Phone + case type */}
          <div className="flex items-center gap-3 mt-0.5">
            {lead.phone && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                <Phone className="w-3 h-3" />
                {lead.phone}
              </span>
            )}
            <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{lead.caseType}</span>
          </div>

          {/* Latest activity note preview */}
          {latestNote ? (
            <div className="mt-1.5 flex items-start gap-1.5">
              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "oklch(0.40 0.01 250)" }} />
              <span
                className="text-xs leading-relaxed line-clamp-2"
                style={{ color: "oklch(0.60 0.005 250)" }}
              >
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
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {/* Snooze to tomorrow */}
          <button
            onClick={e => onSnooze(lead, e)}
            title="Snooze to tomorrow"
            className="p-1.5 rounded hover:bg-white/8 transition-colors"
            style={{ color: "oklch(0.55 0.01 250)" }}
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
          {/* Mark done (clear follow-up date) */}
          <button
            onClick={e => onMarkDone(lead, e)}
            title="Mark done (clear follow-up date)"
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
