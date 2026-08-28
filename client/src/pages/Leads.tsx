import { todayPST, tomorrowPST, addDaysPST, nowDateTimePST } from "@/lib/timezone";
import { PSTDatePicker } from "@/components/PSTDatePicker";
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
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useCRM } from "@/contexts/CRMContext";
import {
  type Lead, type LeadStage, type CaseType, type FollowUp, type FollowUpStatus,
  formatCurrency, formatDate, getLeadTotalReceived, getLeadFollowUps
} from "@/lib/store";
import { toast } from "sonner";
import {
  Plus, Phone,
  Edit2, Trash2, CheckCircle, Search, Filter, Clock,
  MessageSquare, CheckCheck, AlertCircle, X,
  CalendarClock, FileText, Circle, CheckCircle2,
  ChevronLeft, ChevronRight, Settings2, GripVertical, Calendar
} from "lucide-react";
import LeadDetailPanel from "@/components/LeadDetailPanel";
import { useActiveMember } from "@/contexts/ActiveMemberContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { isConvertedStage, isActiveLeadStage } from "@shared/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import LostLeadDialog from "@/components/LostLeadDialog";
import LeadDeleteDialog from "@/components/LeadDeleteDialog";
import ClientPicker from "@/components/ClientPicker";
import LeadSourceField from "@/components/LeadSourceField";
import { getChangedClientFields } from "@/lib/clientRecord";
import { LEAD_SOURCE_OPTIONS, canonicalizeLeadSource } from "@/lib/leadSources";
import { getPipelineRange } from "@/lib/leadPipelineRange";

const STAGES: LeadStage[] = ["New Lead", "Consultation", "Follow-Up", "Retained & Onboarding", "Lost"];
const CASE_TYPES: CaseType[] = ["DA", "SIJS", "AOS", "AO", "K1/K2", "U-Visa", "Green Card", "BIA", "Other"];

const stageColor: Record<LeadStage, string> = {
  "New Lead": "oklch(0.55 0.18 250)",
  "Consultation": "oklch(0.72 0.15 80)",
  "Follow-Up": "oklch(0.65 0.20 300)",  // purple — needs follow-up
  "Retained & Onboarding": "oklch(0.55 0.18 145)",
  "Lost": "oklch(0.60 0.22 25)",
};

// ── AssignedToSelect: reusable dropdown for team member assignment ──────────
function AssignedToSelect({ value, onChange, required = false }: { value: string | null; onChange: (v: string | null) => void; required?: boolean }) {
  const { data: members = [] } = trpc.members.list.useQuery();
  return (
    <Select value={value ?? "__unassigned__"} onValueChange={v => onChange(v === "__unassigned__" ? null : v)}>
      <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
        <SelectValue placeholder={required ? "Select team member *" : "Unassigned"} />
      </SelectTrigger>
      <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
        {!required && <SelectItem value="__unassigned__">Unassigned</SelectItem>}
        {members.filter((m: { id: string; name: string }) => m.id.trim() && m.name.trim()).map((m: { id: string; name: string }) => (
          <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const emptyLead: Omit<Lead, "id"> = {
  name: "", phone: "", email: "", alienNumber: "", dateOfBirth: "", address: "", preferredLanguage: "",
  caseType: "DA", caseNumber: "", source: "",
  stage: "New Lead", notes: "", date: todayPST(),
  retainerBooked: 0, downpayment: 0, quotedAmount: 0, referredBy: "", consultationFee: 0,
  assignedTo: null, followUpDate: todayPST(),
};

// ── Helpers ────────────────────────────────────────────────
function getNextFollowUp(followUps: FollowUp[]): FollowUp | null {
  const pending = followUps.filter(f => f.status === "Pending").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return pending[0] ?? null;
}

function dueDateLabel(dueDate: string): { label: string; color: string; isOverdue: boolean } {
  const today = todayPST();
  const diff = new Date(dueDate + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "oklch(0.65 0.22 25)", isOverdue: true };
  if (days === 0) return { label: "Due today", color: "oklch(0.72 0.15 80)", isOverdue: false };
  if (days === 1) return { label: "Due tomorrow", color: "oklch(0.72 0.12 75)", isOverdue: false };
  return { label: `Due in ${days}d`, color: "oklch(0.55 0.01 250)", isOverdue: false };
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
}

function getLeadAgeDays(dateStr: string): number {
  const today = todayPST();
  const diff = new Date(today + "T12:00:00").getTime() - new Date(dateStr + "T12:00:00").getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function LeadAgeBadge({ dateStr }: { dateStr: string }) {
  const days = getLeadAgeDays(dateStr);
  let color = "oklch(0.55 0.18 145)"; // green
  let bg = "oklch(0.55 0.18 145 / 12%)";
  if (days > 14) { color = "oklch(0.70 0.22 25)"; bg = "oklch(0.70 0.22 25 / 12%)"; }
  else if (days > 7) { color = "oklch(0.80 0.15 80)"; bg = "oklch(0.80 0.15 80 / 12%)"; }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ color, background: bg }}>
      {days === 0 ? "Today" : `${days}d`}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function Leads() {
  const { leads, payments, followUps, addLead, updateLead, addPayment, updateFollowUp, addFollowUp, setLeadFollowUpDate } = useCRM();
  const { activeMember } = useActiveMember();
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [consultationLead, setConsultationLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Omit<Lead, "id">>(emptyLead);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [customSource, setCustomSource] = useState("");
  const [convertForm, setConvertForm] = useState({ retainerBooked: "", downpayment: "", caseNumber: "", notes: "", applyConsultationFee: false });
  const [consultationForm, setConsultationForm] = useState({ fee: 150 as 150 | 200, scheduledFor: todayPST(), notes: "" });
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "All">("All");
  const [filterCaseType, setFilterCaseType] = useState<string>("All");
  const [filterSource, setFilterSource] = useState<string>("All");
  const [pipelineRangeMode, setPipelineRangeMode] = useState<"month" | "week" | "custom">("month");
  const [pipelineBoardScope, setPipelineBoardScope] = useState<"selected" | "all">("selected");
  const [pipelineWeekStart, setPipelineWeekStart] = useState(() => todayPST());
  const [pipelineCustomStart, setPipelineCustomStart] = useState(() => todayPST());
  const [pipelineCustomEnd, setPipelineCustomEnd] = useState(() => todayPST());
  const [expandedSourceBucket, setExpandedSourceBucket] = useState<string | null>(null);
  const [lostLeadPending, setLostLeadPending] = useState<Lead | null>(null);
  const [lostReasonFilter, setLostReasonFilter] = useState("All Reasons");
  const [leadPendingDelete, setLeadPendingDelete] = useState<Lead | null>(null);

  // ── Lead Detail Slide-Over ─────────────────────────────────
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);

  // Horizontal click-and-hold panning for the overflowing pipeline board.
  // Card wrappers and interactive controls are excluded so native lead dragging
  // and button clicks keep their existing behavior.
  const pipelineBoardRef = useRef<HTMLDivElement>(null);
  const boardPanRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; moved: boolean } | null>(null);
  const [isPanningBoard, setIsPanningBoard] = useState(false);

  const handleBoardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [draggable='true']")) return;
    const board = pipelineBoardRef.current;
    if (!board || board.scrollWidth <= board.clientWidth) return;
    boardPanRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: board.scrollLeft,
      moved: false,
    };
    board.setPointerCapture(event.pointerId);
    setIsPanningBoard(true);
  };

  const handleBoardPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = boardPanRef.current;
    const board = pipelineBoardRef.current;
    if (!pan || !board || pan.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pan.startX;
    if (Math.abs(deltaX) > 3) pan.moved = true;
    if (pan.moved) event.preventDefault();
    board.scrollLeft = pan.startScrollLeft - deltaX;
  };

  const endBoardPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = boardPanRef.current;
    if (pan?.pointerId === event.pointerId) {
      boardPanRef.current = null;
      setIsPanningBoard(false);
      if (pipelineBoardRef.current?.hasPointerCapture(event.pointerId)) {
        pipelineBoardRef.current.releasePointerCapture(event.pointerId);
      }
    }
  };

  // Auto-open lead panel when navigated to /leads?lead=ID (e.g. from global search).
  // This is intentionally mount-only: replacing the URL must not feed back into route state.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("lead");
    if (!leadId) return;
    setDetailLeadId(leadId);
    // Clean the URL so refreshing doesn't re-open the panel.
    window.history.replaceState({}, "", "/leads");
  }, []);

  // ── Month selector for the summary card ─────────────────
  const nowPST = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const [summaryMonth, setSummaryMonth] = useState(() => parseInt(nowPST.split("-")[1]));
  const [summaryYear, setSummaryYear] = useState(() => parseInt(nowPST.split("-")[0]));
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // ── Dynamic pipeline stages from DB ──────────────────────
  const { data: dbStages = [] } = trpc.pipeline.getStages.useQuery();
  const { data: allChecklistTemplates = [] } = trpc.pipeline.getAllChecklistTemplates.useQuery();
  const checklistLeadIdSignature = leads.map(lead => lead.id).sort().join(",");
  const checklistCompletionInput = useMemo(
    () => ({ leadIds: checklistLeadIdSignature ? checklistLeadIdSignature.split(",") : [] }),
    [checklistLeadIdSignature],
  );
  const checklistCompletionQueryOptions = useMemo(
    () => ({ enabled: checklistCompletionInput.leadIds.length > 0 }),
    [checklistCompletionInput.leadIds.length],
  );
  const { data: allChecklistCompletions = [] } = trpc.pipeline.getCompletionsForLeads.useQuery(
    checklistCompletionInput,
    checklistCompletionQueryOptions,
  );
  const completedChecklistIdsByLead = useMemo(() => {
    const byLead: Record<string, Set<string>> = {};
    allChecklistCompletions.forEach(completion => {
      if (!completion.completedAt) return;
      (byLead[completion.leadId] ??= new Set()).add(completion.templateItemId);
    });
    return byLead;
  }, [allChecklistCompletions]);

  // ── AI intelligence tier map (cached, no LLM call) ────────
  const { data: aiAnalyses = [] } = trpc.intelligence.getAll.useQuery(undefined, {
    refetchInterval: 300_000, // refresh every 5 minutes
  });
  const aiTierMap = useMemo(() => {
    const map: Record<string, { tier: string; score: number; headline: string }> = {};
    aiAnalyses.forEach((a: { leadId: string; tier: string; score: number; headline: string }) => {
      map[a.leadId] = { tier: a.tier, score: a.score, headline: a.headline };
    });
    return map;
  }, [aiAnalyses]);

  // ── Reschedule counts for warning badges ─────────────────
  const { data: rescheduleCounts = {} } = trpc.leads.getRescheduleCounts.useQuery(undefined, {
    refetchInterval: 60_000, // refresh every minute
  });

  // Build a color map from DB stages (fallback to static map for stages not yet in DB)
  const dynamicStageColor = useMemo(() => {
    const map: Record<string, string> = { ...stageColor };
    dbStages.forEach(s => { map[s.name] = s.color; });
    return map;
  }, [dbStages]);

  // Ordered stage names from DB (fallback to STAGES if DB not loaded yet)
  const pipelineStageNames = useMemo(() => {
    if (dbStages.length === 0) return STAGES as string[];
    return [...dbStages].sort((a, b) => a.order - b.order).map(s => s.name);
  }, [dbStages]);
  const activePipelineStageNames = useMemo(() => pipelineStageNames.filter(stage => stage !== "Lost"), [pipelineStageNames]);

  // ── Bifurcation stats (all-time + monthly) ─────────────────────
  const allTimeActive = useMemo(() => leads.filter(l => isActiveLeadStage(l.stage)).length, [leads]);
  const allTimeConverted = useMemo(() => leads.filter(l => isConvertedStage(l.stage)).length, [leads]);
  const allTimeLost = useMemo(() => leads.filter(l => l.stage === "Lost").length, [leads]);
  const allTimeTotal = allTimeActive + allTimeConverted + allTimeLost;
  const allTimeConvRate = allTimeTotal > 0 ? Math.round((allTimeConverted / allTimeTotal) * 100) : 0;

  const pipelineRange = useMemo(() => {
    const range = getPipelineRange({ mode: pipelineRangeMode, year: summaryYear, month: summaryMonth, weekDate: pipelineWeekStart, customStart: pipelineCustomStart, customEnd: pipelineCustomEnd });
    return pipelineRangeMode === "month" ? { ...range, label: `${MONTHS_SHORT[summaryMonth - 1]} ${summaryYear}` } : range;
  }, [pipelineRangeMode, pipelineWeekStart, pipelineCustomStart, pipelineCustomEnd, summaryYear, summaryMonth]);

  const monthLeadsIn = useMemo(() => leads.filter(l => l.date >= pipelineRange.start && l.date <= pipelineRange.end), [leads, pipelineRange]);
  const monthConverted = useMemo(() => monthLeadsIn.filter(l => isConvertedStage(l.stage)), [monthLeadsIn]);
  const monthLost = useMemo(() => monthLeadsIn.filter(l => l.stage === "Lost"), [monthLeadsIn]);
  const monthConvRate = monthLeadsIn.length > 0 ? Math.round((monthConverted.length / monthLeadsIn.length) * 100) : 0;

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search) || l.caseNumber.toLowerCase().includes(search.toLowerCase());
      const matchStage = filterStage === "All" || l.stage === filterStage;
      const matchCase = filterCaseType === "All" || l.caseType === filterCaseType;
      const matchSource = filterSource === "All" || canonicalizeLeadSource(l.source) === filterSource;
      const matchRange = pipelineBoardScope === "all" || (l.date >= pipelineRange.start && l.date <= pipelineRange.end);
      return matchSearch && matchStage && matchCase && matchSource && matchRange;
    });
  }, [leads, search, filterStage, filterCaseType, filterSource, pipelineBoardScope, pipelineRange]);

  const leadSourceFilters = useMemo(() => {
    const values = new Set(leads.map(lead => canonicalizeLeadSource(lead.source)));
    const ordered = LEAD_SOURCE_OPTIONS.filter(source => values.has(source));
    const custom = Array.from(values).filter(source => source !== "Unknown" && !LEAD_SOURCE_OPTIONS.includes(source as (typeof LEAD_SOURCE_OPTIONS)[number])).sort();
    if (values.has("Unknown")) custom.push("Unknown");
    return [...ordered, ...custom];
  }, [leads]);

  const sourceOverviewLeads = useMemo(() => leads.filter(lead => (filterSource === "All" || canonicalizeLeadSource(lead.source) === filterSource) && lead.date >= pipelineRange.start && lead.date <= pipelineRange.end), [leads, filterSource, pipelineRange]);
  const sourceOverviewBuckets = useMemo(() => {
    const buckets = pipelineStageNames.map(stage => ({ key: stage, label: stage, leads: sourceOverviewLeads.filter(lead => lead.stage === stage) }));
    const converted = sourceOverviewLeads.filter(lead => isConvertedStage(lead.stage));
    const lost = sourceOverviewLeads.filter(lead => lead.stage === "Lost");
    const consulted = sourceOverviewLeads.filter(lead => Boolean(lead.consultationBookedDate || payments.some(payment => payment.leadId === lead.id && payment.receivedFor.trim().toLowerCase().includes("consultation"))));
    return [...buckets, { key: "__converted__", label: "Converted (summary)", leads: converted }, { key: "__lost__", label: "Lost (summary)", leads: lost }, { key: "__consulted__", label: "Consultations booked", leads: consulted }];
  }, [pipelineStageNames, sourceOverviewLeads, payments]);

  const lostLeads = useMemo(() => filtered.filter(lead => lead.stage === "Lost"), [filtered]);
  const lossReasonOptions = useMemo(() => Array.from(new Set(lostLeads.map(lead => lead.lostReason || "Reason not recorded"))).sort(), [lostLeads]);
  const lostLeadsForReview = useMemo(() => lostLeads.filter(lead => lostReasonFilter === "All Reasons" || (lead.lostReason || "Reason not recorded") === lostReasonFilter), [lostLeads, lostReasonFilter]);

  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    pipelineStageNames.forEach(s => { map[s] = []; });
    // Catch leads in stages not yet in the map (e.g. renamed stages)
    filtered.forEach(l => {
      if (!map[l.stage]) map[l.stage] = [];
      map[l.stage].push(l);
    });
    return map;
  }, [filtered, pipelineStageNames]);

  const stageValue = useMemo(() => {
    const map: Record<string, number> = {};
    pipelineStageNames.forEach(s => { map[s] = 0; });
    // Only count quotedAmount for pre-retained stages; Retained/Onboarding are clients, not pipeline
    const PIPELINE_STAGES_SET = new Set(["New Lead", "Consultation", "Follow-Up"]);
    leads.forEach(l => {
      if (PIPELINE_STAGES_SET.has(l.stage)) {
        map[l.stage] = (map[l.stage] || 0) + (l.quotedAmount || 0);
      }
    });
    return map;
  }, [leads, pipelineStageNames]);

  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  // ── Inline pipeline management state ─────────────────────
  const pipelineUtils = trpc.useUtils();
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState("");
  const [openGearStageId, setOpenGearStageId] = useState<string | null>(null);
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistLabel, setEditingChecklistLabel] = useState("");
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("oklch(0.55 0.18 250)");
  const [deleteConfirmStageId, setDeleteConfirmStageId] = useState<string | null>(null);

  const PRESET_COLORS = [
    "oklch(0.55 0.18 250)", // blue
    "oklch(0.72 0.15 80)",  // gold
    "oklch(0.65 0.20 300)", // purple
    "oklch(0.55 0.18 145)", // green
    "oklch(0.65 0.18 200)", // teal
    "oklch(0.60 0.22 25)",  // red
    "oklch(0.65 0.18 160)", // mint
    "oklch(0.60 0.20 340)", // pink
    "oklch(0.55 0.15 220)", // indigo
    "oklch(0.65 0.15 60)",  // orange
  ];

  const reorderMut = trpc.pipeline.reorderStages.useMutation({ onSuccess: () => pipelineUtils.pipeline.getStages.invalidate() });
  const updateStageMut = trpc.pipeline.updateStage.useMutation({ onSuccess: () => pipelineUtils.pipeline.getStages.invalidate() });
  const deleteStageMut = trpc.pipeline.deleteStage.useMutation({ onSuccess: () => pipelineUtils.pipeline.getStages.invalidate() });
  const createStageMut = trpc.pipeline.createStage.useMutation({ onSuccess: () => pipelineUtils.pipeline.getStages.invalidate() });
  const createChecklistMut = trpc.pipeline.createChecklistTemplate.useMutation({ onSuccess: () => pipelineUtils.pipeline.getAllChecklistTemplates.invalidate() });
  const updateChecklistMut = trpc.pipeline.updateChecklistTemplate.useMutation({ onSuccess: () => pipelineUtils.pipeline.getAllChecklistTemplates.invalidate() });
  const deleteChecklistMut = trpc.pipeline.deleteChecklistTemplate.useMutation({ onSuccess: () => pipelineUtils.pipeline.getAllChecklistTemplates.invalidate() });
  const toggleChecklistCompletionMut = trpc.pipeline.toggleCompletion.useMutation({
    onSuccess: () => pipelineUtils.pipeline.getCompletionsForLeads.invalidate(),
  });
  const bookConsultationMut = trpc.leads.bookConsultation.useMutation({
    onSuccess: async () => {
      await pipelineUtils.leads.list.invalidate();
      await pipelineUtils.payments.list.invalidate();
      setConsultationLead(null);
      setConsultationForm({ fee: 150, scheduledFor: todayPST(), notes: "" });
      toast.success("Consultation booked and fee payment recorded.");
    },
    onError: error => toast.error(error.message),
  });

  const handleMoveStage = (stageId: string, direction: "left" | "right") => {
    const sorted = [...dbStages].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(s => s.id === stageId);
    if (direction === "left" && idx === 0) return;
    if (direction === "right" && idx === sorted.length - 1) return;
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    const newOrder = sorted.map((s, i) => {
      if (i === idx) return { id: s.id, order: sorted[swapIdx].order };
      if (i === swapIdx) return { id: s.id, order: sorted[idx].order };
      return { id: s.id, order: s.order };
    });
    reorderMut.mutate(newOrder);
  };

  const handleRenameStage = (stageId: string) => {
    if (!editingStageName.trim()) return;
    updateStageMut.mutate({ id: stageId, name: editingStageName.trim() });
    setEditingStageId(null);
    setEditingStageName("");
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    const maxOrder = dbStages.length > 0 ? Math.max(...dbStages.map(s => s.order)) + 1 : 1;
    createStageMut.mutate({ name: newStageName.trim(), color: newStageColor, order: maxOrder });
    setNewStageName("");
    setNewStageColor("oklch(0.55 0.18 250)");
    setShowAddStage(false);
    toast.success("Stage added");
  };

  const handleDeleteStage = (stageId: string) => {
    deleteStageMut.mutate({ id: stageId });
    setDeleteConfirmStageId(null);
    setOpenGearStageId(null);
    toast.success("Stage deleted");
  };

  const handleAddChecklistItem = (stageId: string) => {
    if (!newChecklistLabel.trim()) return;
    const stageTemplatesForStage = allChecklistTemplates.filter(t => t.stageId === stageId);
    createChecklistMut.mutate({ stageId, label: newChecklistLabel.trim(), order: stageTemplatesForStage.length });
    setNewChecklistLabel("");
    toast.success("Checklist item added");
  };

  const handleSaveChecklistItem = (id: string) => {
    if (!editingChecklistLabel.trim()) return;
    updateChecklistMut.mutate({ id, label: editingChecklistLabel.trim() });
    setEditingChecklistId(null);
    setEditingChecklistLabel("");
  };

  const handleToggleChecklistCompletion = useCallback((leadId: string, templateItemId: string, isCompleted: boolean) => {
    toggleChecklistCompletionMut.mutate({
      leadId,
      templateItemId,
      completedAt: isCompleted ? null : new Date().toISOString(),
      completedBy: isCompleted ? null : (activeMember?.name ?? "Staff"),
    });
  }, [activeMember?.name, toggleChecklistCompletionMut]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    // Set both a namespaced key and the standard text payload so native mouse drag
    // works consistently across Chromium drag/drop surfaces.
    e.dataTransfer.setData("leadId", leadId);
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => setDragOverStage(null);

  const openBookConsultation = (lead: Lead) => {
    setConsultationLead(lead);
    setConsultationForm({
      fee: 150,
      scheduledFor: lead.followUpDate && lead.followUpDate >= todayPST() ? lead.followUpDate : todayPST(),
      notes: "",
    });
  };

  const handleBookConsultation = () => {
    if (!consultationLead) return;
    if (!consultationForm.scheduledFor || consultationForm.scheduledFor < todayPST()) {
      toast.error("Select a consultation date of today or later.");
      return;
    }
    bookConsultationMut.mutate({
      id: consultationLead.id,
      fee: consultationForm.fee,
      scheduledFor: consultationForm.scheduledFor,
      notes: consultationForm.notes,
      actorName: activeMember?.name ?? "Team",
    });
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId") || e.dataTransfer.getData("text/plain");
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === targetStage) { setDragOverStage(null); return; }
    if (targetStage === "Consultation Scheduled" || targetStage === "Consultation") {
      toast.error("Use Book Consultation to record the paid $150 or $200 fee before scheduling.");
    } else if (targetStage === "Lost" && lead.stage !== "Lost") {
      setLostLeadPending(lead);
    } else if (targetStage === "Retained & Onboarding" && !isConvertedStage(lead.stage)) {
      // Only trigger Convert modal if the lead is NOT already a converted client.
      setConvertLead(lead);
      setConvertForm({ retainerBooked: "", downpayment: "", caseNumber: lead.caseNumber || "", notes: "", applyConsultationFee: false });
    } else {
      updateLead(leadId, { stage: targetStage, actorName: activeMember?.name ?? "Team" });
      toast.success(`Moved to ${targetStage}`);
      // Follow-up work is created after a booked consultation or when explicitly moved to Follow-Up.
      if (targetStage === "Consultation Booked" || targetStage === "Follow-Up") {
        const hasPending = followUps.some(f => f.leadId === leadId && f.status === "Pending");
        if (!hasPending) {
          const tomorrowStr = tomorrowPST();
          const title = targetStage === "Follow-Up" ? "Follow up with client" : "Follow up after consultation";
          addFollowUp({
            leadId,
            dueDate: tomorrowStr,
            title,
            status: "Pending",
            assignedTo: activeMember?.name ?? null,
          });
          toast.info("Follow-up task auto-created for tomorrow");
        }
      }
    }
    setDragOverStage(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const sourceForSave = form.source === "Other" ? customSource.trim() || "Other" : form.source;
    if (!editLead && selectedClientId) {
      const selected = leads.find(lead => lead.id === selectedClientId);
      if (!selected) { setSelectedClientId(null); }
      else {
        const changedFields = getChangedClientFields(selected, form);
        if (changedFields.length > 0) {
          const updateMaster = window.confirm(`This person already exists as ${selected.name}. Update the existing client record with the edited fields? Choose Cancel to keep the form open without saving.`);
          if (!updateMaster) return;
          try {
            await updateLead(selected.id, {
              name: form.name,
              phone: form.phone,
              email: form.email,
              alienNumber: form.alienNumber,
              dateOfBirth: form.dateOfBirth,
              address: form.address,
              preferredLanguage: form.preferredLanguage,
              caseType: form.caseType,
              caseNumber: form.caseNumber,
              source: sourceForSave,
              referredBy: form.referredBy,
              actorName: activeMember?.name ?? "Team",
            });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update the existing client record.");
            return;
          }
          toast.success("Existing client record updated; no duplicate lead created.");
        } else {
          toast.info("Existing client selected; no duplicate lead was created.");
        }
        setSelectedClientId(null);
        setEditLead(null);
        setShowAdd(false);
        setForm(emptyLead);
        return;
      }
    }
    if (editLead) {
      // If changing to Lost stage, prompt for reason
      if (form.stage === "Lost" && editLead.stage !== "Lost") {
        setLostLeadPending({ ...editLead, ...form } as Lead);
        setShowAdd(false);
        return;
      }
      // Exclude 'notes' from edit dialog updates — case notes are only editable
      // from the LeadDetailPanel dedicated notes editor to prevent accidental wipes.
      const { notes: _notes, ...formWithoutNotes } = form;
      updateLead(editLead.id, { ...formWithoutNotes, source: sourceForSave, actorName: activeMember?.name ?? "Team" });
      toast.success("Lead updated");
      // Auto-log consultation fee when stage changes to Consultation via edit form
      if (form.stage === "Consultation" && editLead.stage !== "Consultation" && (form.consultationFee ?? 0) > 0) {
        const alreadyLogged = payments.some(p => p.leadId === editLead.id && p.receivedFor === "Consultation Fee");
        if (!alreadyLogged) {
          addPayment({
            date: todayPST(),
            clientName: form.name,
            leadId: editLead.id,
            caseType: form.caseType,
            caseNumber: form.caseNumber,
            paymentType: "New Client",
            amount: form.consultationFee!,
            receivedFor: "Consultation Fee",
            notes: "",
          });
          toast.info(`Consultation fee $${form.consultationFee} logged as payment`);
        }
      }
      setEditLead(null);
      setShowAdd(false);
    } else {
      if (!form.assignedTo?.trim()) { toast.error("Assign a team member before creating this lead."); return; }
      if (!form.followUpDate || form.followUpDate < todayPST()) { toast.error("Set a follow-up date of today or later before creating this lead."); return; }
      if (form.stage === "Lost") { toast.error("Create the lead in the active pipeline, then use Mark Lost so the required review is recorded."); return; }
      await addLead({ ...form, source: sourceForSave });
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
      stage: "Retained & Onboarding",
      retainerBooked: retainer,
      downpayment: dp,
      caseNumber: convertForm.caseNumber || convertLead.caseNumber,
      convertedDate: todayPST(),
      consultationFeeAppliedToRetainer: convertForm.applyConsultationFee,
      actorName: activeMember?.name ?? "Team",
    });
    if (dp > 0) {
      addPayment({
        date: todayPST(),
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
    setConvertForm({ retainerBooked: "", downpayment: "", caseNumber: "", notes: "", applyConsultationFee: false });
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    const { id, ...rest } = lead;
    setForm(rest);
    setCustomSource(LEAD_SOURCE_OPTIONS.includes(lead.source as (typeof LEAD_SOURCE_OPTIONS)[number]) ? "" : lead.source);
    setShowAdd(true);
  };

  const openDetail = (lead: Lead) => {
    setDetailLeadId(lead.id);
  };

  // Card-level quick actions (still used on the kanban card strip)
  const handleMarkDone = (fu: FollowUp) => { updateFollowUp(fu.id, { status: "Done" }); toast.success("Marked as done"); };
  const handleSnooze = (fu: FollowUp) => {
    updateFollowUp(fu.id, { status: "Pending", dueDate: tomorrowPST() });
    toast.success("Snoozed to tomorrow");
  };
  const handleReschedule = (fu: FollowUp, newDate: string) => {
    updateFollowUp(fu.id, { dueDate: newDate });
    toast.success("Due date updated");
  };

  const today = todayPST();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
            Leads Pipeline
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
            {monthLeadsIn.length} leads in {pipelineRange.label} · {monthConverted.length} converted · {monthLost.length} lost · {allTimeTotal} all-time
          </p>
        </div>
        <Button onClick={() => { setEditLead(null); setForm(emptyLead); setShowAdd(true); }}
          style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>
          <Plus className="w-4 h-4 mr-2" /> Add Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap flex-col sm:flex-row">
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
            {pipelineStageNames.filter(s => s.trim()).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* Case type quick-filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {["All", ...CASE_TYPES].map(ct => (
          <button
            key={ct}
            onClick={() => setFilterCaseType(ct)}
            className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
            style={{
              background: filterCaseType === ct ? "oklch(0.72 0.12 75 / 20%)" : "oklch(0.18 0.025 250)",
              color: filterCaseType === ct ? "oklch(0.72 0.12 75)" : "oklch(0.55 0.01 250)",
              border: `1px solid ${filterCaseType === ct ? "oklch(0.72 0.12 75 / 50%)" : "oklch(1 0 0 / 10%)"}`,
            }}
          >
            {ct === "All" ? "All Cases" : ct}
            {ct !== "All" && (
              <span className="ml-1 opacity-60">
                ({monthLeadsIn.filter(l => l.caseType === ct).length})
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Lead source quick-filter chips */}
      <div className="space-y-1.5" aria-label="Lead source filters">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.48 0.01 250)" }}>Lead Sources</span>
          {filterSource !== "All" && <button onClick={() => setFilterSource("All")} className="text-[10px] hover:underline" style={{ color: "oklch(0.72 0.12 75)" }}>Clear source</button>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["All", ...leadSourceFilters].map(source => (
            <button
              key={source}
              onClick={() => setFilterSource(source)}
              aria-pressed={filterSource === source}
              className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
              style={{
                background: filterSource === source ? "oklch(0.65 0.15 250 / 20%)" : "oklch(0.18 0.025 250)",
                color: filterSource === source ? "oklch(0.72 0.15 250)" : "oklch(0.55 0.01 250)",
                border: `1px solid ${filterSource === source ? "oklch(0.65 0.15 250 / 55%)" : "oklch(1 0 0 / 10%)"}`,
              }}
            >
              {source === "All" ? "All Sources" : source}
              {source !== "All" && <span className="ml-1 opacity-60">({monthLeadsIn.filter(lead => canonicalizeLeadSource(lead.source) === source).length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Source-specific pipeline overview */}
      {filterSource !== "All" && (
        <div className="rounded-lg border p-4" style={{ background: "oklch(0.16 0.025 250)", borderColor: "oklch(0.65 0.15 250 / 35%)" }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.15 250)" }}>Pipeline Overview · {filterSource}</h2>
              <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.01 250)" }}>Showing {pipelineRange.label}. Click any bucket to filter the Kanban or inspect its leads.</p>
            </div>
            <span className="text-xs font-semibold" style={{ color: "oklch(0.80 0.005 250)" }}>{sourceOverviewLeads.length} leads</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {sourceOverviewBuckets.map(bucket => {
              const isExpanded = expandedSourceBucket === bucket.key;
              return (
                <div key={bucket.key} className="min-w-0">
                  <button
                    onClick={() => {
                      setExpandedSourceBucket(isExpanded ? null : bucket.key);
                      if (!bucket.key.startsWith("__") && bucket.leads.length > 0) setFilterStage(bucket.key as LeadStage);
                    }}
                    aria-expanded={isExpanded}
                    className="w-full rounded-md p-2 text-left transition-colors hover:bg-white/5"
                    style={{ background: isExpanded ? "oklch(0.22 0.04 250)" : "oklch(0.19 0.03 250)", border: `1px solid ${isExpanded ? "oklch(0.65 0.15 250 / 55%)" : "oklch(1 0 0 / 8%)"}` }}
                  >
                    <div className="text-[10px] uppercase tracking-wide truncate" style={{ color: "oklch(0.55 0.01 250)" }}>{bucket.label}</div>
                    <div className="text-lg font-bold" style={{ color: bucket.key === "__lost__" ? "oklch(0.70 0.22 25)" : bucket.key === "__converted__" ? "oklch(0.65 0.18 145)" : "oklch(0.85 0.01 250)" }}>{bucket.leads.length}</div>
                  </button>
                  {isExpanded && (
                    <div className="mt-1 rounded-md p-2 space-y-1 max-h-36 overflow-auto" style={{ background: "oklch(0.13 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                      {bucket.leads.length === 0 ? <span className="text-[11px]" style={{ color: "oklch(0.45 0.01 250)" }}>No leads in this bucket.</span> : bucket.leads.map(lead => (
                        <button key={lead.id} onClick={() => setDetailLeadId(lead.id)} className="block w-full text-left text-[11px] truncate hover:underline" style={{ color: "oklch(0.86 0.01 250)" }}>{lead.name} · {lead.caseType} · {lead.stage}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Lead Bifurcation Summary Card ─────────────────────── */}
      <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.16 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 25%)" }}>
        {/* Header row with month navigator */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Pipeline Overview</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "oklch(1 0 0 / 12%)" }} role="group" aria-label="Pipeline date scope">
              {([['month', 'Month'], ['week', 'Week'], ['custom', 'Custom']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setPipelineRangeMode(mode)} aria-pressed={pipelineRangeMode === mode}
                  className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors"
                  style={{ background: pipelineRangeMode === mode ? "oklch(0.72 0.12 75 / 22%)" : "transparent", color: pipelineRangeMode === mode ? "oklch(0.78 0.12 75)" : "oklch(0.55 0.01 250)" }}>
                  {label}
                </button>
              ))}
            </div>
            {pipelineRangeMode === "month" && <>
              <button aria-label="Previous month" onClick={() => { if (summaryMonth === 1) { setSummaryMonth(12); setSummaryYear(y => y - 1); } else setSummaryMonth(m => m - 1); }} className="p-1 rounded hover:bg-white/8" style={{ color: "oklch(0.55 0.01 250)" }}><ChevronLeft className="w-3.5 h-3.5" /></button>
              <span className="text-xs font-medium min-w-20 text-center" style={{ color: "oklch(0.75 0.01 250)" }}>{MONTHS_SHORT[summaryMonth - 1]} {summaryYear}</span>
              <button aria-label="Next month" onClick={() => { if (summaryMonth === 12) { setSummaryMonth(1); setSummaryYear(y => y + 1); } else setSummaryMonth(m => m + 1); }} className="p-1 rounded hover:bg-white/8" style={{ color: "oklch(0.55 0.01 250)" }}><ChevronRight className="w-3.5 h-3.5" /></button>
            </>}
            {pipelineRangeMode === "week" && <Input aria-label="Week containing" type="date" value={pipelineWeekStart} onChange={e => setPipelineWeekStart(e.target.value)} className="h-7 w-32 text-[11px]" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.80 0.01 250)" }} />}
            {pipelineRangeMode === "custom" && <div className="flex items-center gap-1"><Input aria-label="Range start" type="date" value={pipelineCustomStart} onChange={e => setPipelineCustomStart(e.target.value)} className="h-7 w-32 text-[11px]" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.80 0.01 250)" }} /><span className="text-[10px]" style={{ color: "oklch(0.45 0.01 250)" }}>to</span><Input aria-label="Range end" type="date" min={pipelineCustomStart} value={pipelineCustomEnd} onChange={e => setPipelineCustomEnd(e.target.value)} className="h-7 w-32 text-[11px]" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.80 0.01 250)" }} /></div>}
            <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "oklch(1 0 0 / 12%)" }} role="group" aria-label="Kanban board scope">
              {([['selected', 'Scoped board'], ['all', 'All-time board']] as const).map(([scope, label]) => (
                <button key={scope} onClick={() => setPipelineBoardScope(scope)} aria-pressed={pipelineBoardScope === scope} className="px-2 py-1 text-[10px] transition-colors"
                  style={{ background: pipelineBoardScope === scope ? "oklch(0.65 0.15 250 / 22%)" : "transparent", color: pipelineBoardScope === scope ? "oklch(0.75 0.12 250)" : "oklch(0.55 0.01 250)" }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Two-column layout: Selected scope | All-Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          {/* Monthly column */}
          <div className="px-5 py-4" style={{ borderRight: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.55 0.01 250)" }}>
              {pipelineRange.label} — Selected scope
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg px-3 py-2.5" style={{ background: "oklch(0.65 0.15 250 / 10%)", border: "1px solid oklch(0.65 0.15 250 / 20%)" }}>
                <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>{monthLeadsIn.length}</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "oklch(0.65 0.15 250)" }}>Leads In</div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>entered pipeline</div>
              </div>
              <div className="rounded-lg px-3 py-2.5" style={{ background: "oklch(0.55 0.18 145 / 10%)", border: "1px solid oklch(0.55 0.18 145 / 20%)" }}>
                <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>{monthConverted.length}</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "oklch(0.55 0.18 145)" }}>Converted</div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>{monthConvRate}% conv. rate</div>
              </div>
              <div className="rounded-lg px-3 py-2.5" style={{ background: "oklch(0.65 0.18 25 / 10%)", border: "1px solid oklch(0.65 0.18 25 / 20%)" }}>
                <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>{monthLost.length}</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "oklch(0.65 0.18 25)" }}>Lost</div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>did not convert</div>
              </div>
            </div>
          </div>

          {/* All-Time column */}
          <div className="px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.55 0.01 250)" }}>
              All-Time — {allTimeTotal} Total Leads
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg px-3 py-2.5" style={{ background: "oklch(0.65 0.15 250 / 10%)", border: "1px solid oklch(0.65 0.15 250 / 20%)" }}>
                <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>{allTimeActive}</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "oklch(0.65 0.15 250)" }}>Active</div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>in pipeline now</div>
              </div>
              <div className="rounded-lg px-3 py-2.5" style={{ background: "oklch(0.55 0.18 145 / 10%)", border: "1px solid oklch(0.55 0.18 145 / 20%)" }}>
                <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>{allTimeConverted}</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "oklch(0.55 0.18 145)" }}>Converted</div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>{allTimeConvRate}% all-time rate</div>
              </div>
              <div className="rounded-lg px-3 py-2.5" style={{ background: "oklch(0.65 0.18 25 / 10%)", border: "1px solid oklch(0.65 0.18 25 / 20%)" }}>
                <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>{allTimeLost}</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "oklch(0.65 0.18 25)" }}>Lost</div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>{allTimeTotal > 0 ? Math.round((allTimeLost / allTimeTotal) * 100) : 0}% of total</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="flex rounded-full overflow-hidden h-1.5 mt-3">
              <div style={{ width: `${allTimeTotal > 0 ? (allTimeActive / allTimeTotal) * 100 : 0}%`, background: "oklch(0.65 0.15 250)" }} />
              <div style={{ width: `${allTimeTotal > 0 ? (allTimeConverted / allTimeTotal) * 100 : 0}%`, background: "oklch(0.55 0.18 145)" }} />
              <div style={{ width: `${allTimeTotal > 0 ? (allTimeLost / allTimeTotal) * 100 : 0}%`, background: "oklch(0.65 0.18 25)" }} />
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs" style={{ color: "oklch(0.65 0.15 250)" }}>■ Active</span>
              <span className="text-xs" style={{ color: "oklch(0.55 0.18 145)" }}>■ Converted</span>
              <span className="text-xs" style={{ color: "oklch(0.65 0.18 25)" }}>■ Lost</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline columns — dynamic from DB */}
      <div
        ref={pipelineBoardRef}
        className={`flex gap-4 overflow-x-auto pb-2 ${isPanningBoard ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ minHeight: 400, userSelect: isPanningBoard ? "none" : "auto", touchAction: "pan-y" }}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={endBoardPan}
        onPointerCancel={endBoardPan}
      >
        {/* Close gear popover when clicking outside */}
        {openGearStageId && (
          <div className="fixed inset-0 z-40" onClick={() => { setOpenGearStageId(null); setDeleteConfirmStageId(null); }} />
        )}

        {activePipelineStageNames.map(stage => {
          const color = dynamicStageColor[stage] ?? "oklch(0.55 0.18 250)";
          const stageLeads = byStage[stage] ?? [];
          const dbStage = dbStages.find(s => s.name === stage);
          const stageTemplates = allChecklistTemplates.filter(t => dbStage && t.stageId === dbStage.id);
          return (
            <div
              key={stage}
              className="rounded-lg border overflow-hidden transition-all flex-shrink-0"
              style={{
                width: 280,
                background: dragOverStage === stage ? "oklch(0.20 0.035 250)" : "oklch(0.16 0.025 250)",
                borderColor: dragOverStage === stage ? color : "oklch(1 0 0 / 8%)",
              }}
              onDragOver={e => { e.preventDefault(); setDragOverStage(stage as LeadStage); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={e => handleDrop(e, stage as LeadStage)}
            >
              <div className="px-3 py-2.5 border-b" style={{ borderColor: "oklch(1 0 0 / 8%)", borderLeft: `3px solid ${color}` }}>
                {/* Stage header row: arrows + name + count + gear */}
                <div className="flex items-center gap-1">
                  {/* Left arrow */}
                  <button
                    onClick={() => dbStage && handleMoveStage(dbStage.id, "left")}
                    disabled={!dbStage || [...dbStages].sort((a,b)=>a.order-b.order)[0]?.id === dbStage?.id}
                    className="p-0.5 rounded transition-opacity hover:opacity-80 disabled:opacity-20"
                    style={{ color: "oklch(0.55 0.01 250)" }}
                    title="Move stage left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Stage name — click to rename inline */}
                  <div className="flex-1 min-w-0">
                    {editingStageId === dbStage?.id ? (
                      <input
                        autoFocus
                        value={editingStageName}
                        onChange={e => setEditingStageName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleRenameStage(dbStage!.id);
                          if (e.key === "Escape") { setEditingStageId(null); setEditingStageName(""); }
                        }}
                        onBlur={() => handleRenameStage(dbStage!.id)}
                        className="w-full text-sm font-semibold bg-transparent border-b outline-none"
                        style={{ color: "oklch(0.93 0.005 250)", borderColor: color }}
                      />
                    ) : (
                      <button
                        onClick={() => { if (dbStage) { setEditingStageId(dbStage.id); setEditingStageName(stage); } }}
                        className="text-sm font-semibold text-left w-full truncate hover:opacity-80 transition-opacity"
                        style={{ color: "oklch(0.80 0.005 250)" }}
                        title="Click to rename"
                      >
                        {stage}
                      </button>
                    )}
                  </div>

                  {/* Lead count badge */}
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: `${color}20`, color }}>
                    {stageLeads.length}
                  </span>

                  {/* Right arrow */}
                  <button
                    onClick={() => dbStage && handleMoveStage(dbStage.id, "right")}
                    disabled={!dbStage || [...dbStages].sort((a,b)=>a.order-b.order).at(-1)?.id === dbStage?.id}
                    className="p-0.5 rounded transition-opacity hover:opacity-80 disabled:opacity-20"
                    style={{ color: "oklch(0.55 0.01 250)" }}
                    title="Move stage right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Gear icon — opens checklist/delete popover */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenGearStageId(openGearStageId === dbStage?.id ? null : (dbStage?.id ?? null))}
                      className="p-0.5 rounded transition-opacity hover:opacity-80"
                      style={{ color: openGearStageId === dbStage?.id ? color : "oklch(0.45 0.01 250)" }}
                      title="Stage settings"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Gear popover */}
                    {openGearStageId === dbStage?.id && dbStage && (
                      <div
                        className="absolute right-0 top-7 z-50 rounded-lg shadow-xl p-3 w-64"
                        style={{ background: "oklch(0.20 0.030 250)", border: "1px solid oklch(1 0 0 / 15%)", minWidth: 240 }}
                      >
                        {/* Color picker */}
                        <div className="mb-3">
                          <p className="text-xs font-semibold mb-1.5" style={{ color: "oklch(0.55 0.01 250)" }}>Stage Color</p>
                          <div className="flex flex-wrap gap-1.5">
                            {PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                onClick={() => updateStageMut.mutate({ id: dbStage.id, color: c })}
                                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                                style={{ background: c, outline: dbStage.color === c ? `2px solid oklch(0.93 0.005 250)` : "none", outlineOffset: 2 }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Checklist items */}
                        <div className="mb-3">
                          <p className="text-xs font-semibold mb-1.5" style={{ color: "oklch(0.55 0.01 250)" }}>Checklist Steps</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {allChecklistTemplates.filter(t => t.stageId === dbStage.id).sort((a,b)=>a.order-b.order).map(t => (
                              <div key={t.id} className="flex items-center gap-1.5">
                                {editingChecklistId === t.id ? (
                                  <>
                                    <input
                                      autoFocus
                                      value={editingChecklistLabel}
                                      onChange={e => setEditingChecklistLabel(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") handleSaveChecklistItem(t.id);
                                        if (e.key === "Escape") { setEditingChecklistId(null); setEditingChecklistLabel(""); }
                                      }}
                                      onBlur={() => handleSaveChecklistItem(t.id)}
                                      className="flex-1 text-xs bg-transparent border-b outline-none"
                                      style={{ color: "oklch(0.93 0.005 250)", borderColor: color }}
                                    />
                                    <button onClick={() => handleSaveChecklistItem(t.id)} className="text-xs" style={{ color: "oklch(0.55 0.18 145)" }}>✓</button>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex-1 text-xs truncate" style={{ color: "oklch(0.80 0.005 250)" }}>{t.label}</span>
                                    <button onClick={() => { setEditingChecklistId(t.id); setEditingChecklistLabel(t.label); }} className="p-0.5 hover:opacity-80" style={{ color: "oklch(0.55 0.01 250)" }}><Edit2 className="w-3 h-3" /></button>
                                    <button onClick={() => { deleteChecklistMut.mutate({ id: t.id }); toast.success("Step removed"); }} className="p-0.5 hover:opacity-80" style={{ color: "oklch(0.65 0.18 25)" }}><Trash2 className="w-3 h-3" /></button>
                                  </>
                                )}
                              </div>
                            ))}
                            {allChecklistTemplates.filter(t => t.stageId === dbStage.id).length === 0 && (
                              <p className="text-xs" style={{ color: "oklch(0.40 0.01 250)" }}>No steps yet</p>
                            )}
                          </div>
                          {/* Add new checklist item */}
                          <div className="flex gap-1 mt-2">
                            <input
                              value={newChecklistLabel}
                              onChange={e => setNewChecklistLabel(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") handleAddChecklistItem(dbStage.id); }}
                              placeholder="Add step..."
                              className="flex-1 text-xs px-2 py-1 rounded outline-none"
                              style={{ background: "oklch(0.16 0.025 250)", color: "oklch(0.93 0.005 250)", border: "1px solid oklch(1 0 0 / 15%)" }}
                            />
                            <button
                              onClick={() => handleAddChecklistItem(dbStage.id)}
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ background: `${color}25`, color }}
                            >+</button>
                          </div>
                        </div>

                        {/* Delete stage */}
                        <div className="border-t pt-2" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>
                          {deleteConfirmStageId === dbStage.id ? (
                            <div className="space-y-1.5">
                              <p className="text-xs" style={{ color: "oklch(0.70 0.22 25)" }}>Delete this stage? This cannot be undone.</p>
                              <div className="flex gap-2">
                                <button onClick={() => handleDeleteStage(dbStage.id)} className="flex-1 text-xs py-1 rounded font-medium" style={{ background: "oklch(0.60 0.22 25 / 20%)", color: "oklch(0.70 0.22 25)" }}>Delete</button>
                                <button onClick={() => setDeleteConfirmStageId(null)} className="flex-1 text-xs py-1 rounded" style={{ background: "oklch(0.16 0.025 250)", color: "oklch(0.55 0.01 250)" }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmStageId(dbStage.id)} className="w-full text-xs py-1 rounded transition-opacity hover:opacity-80" style={{ color: "oklch(0.65 0.18 25)" }}>
                              <Trash2 className="w-3 h-3 inline mr-1" /> Delete Stage
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pipeline value — only shown for pre-retained stages */}
                {(stageValue[stage] ?? 0) > 0 && !isConvertedStage(stage) && (
                  <div className="text-xs mt-1 font-medium" style={{ color: "oklch(0.72 0.12 75)" }}>
                    {formatCurrency(stageValue[stage])} pipeline
                  </div>
                )}
              </div>
              <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-xs" style={{ color: dragOverStage === stage ? color : "oklch(0.40 0.01 250)" }}>
                    {dragOverStage === stage ? "Drop here" : "No leads"}
                  </div>
                )}
                {stageLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={e => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    style={{ cursor: "grab" }}
                  >
                    <LeadCard
                      lead={lead}
                      stageTemplates={stageTemplates}
                      completedTemplateIds={completedChecklistIdsByLead[lead.id]}
                      stageColor={color}
                      rescheduleCount={rescheduleCounts[lead.id] ?? 0}
                      aiTier={aiTierMap[lead.id]}
                      onOpenDetail={() => openDetail(lead)}
                      onEdit={() => openEdit(lead)}
                      onDelete={() => setLeadPendingDelete(lead)}
                      onConvert={() => setConvertLead(lead)}
                      onBookConsultation={() => openBookConsultation(lead)}
                      onMarkLost={() => setLostLeadPending(lead)}
                      onToggleChecklistCompletion={(templateItemId, isCompleted) => handleToggleChecklistCompletion(lead.id, templateItemId, isCompleted)}
                      onMarkDone={handleMarkDone}
                      onReschedule={handleReschedule}
                      onSetFollowUpDate={(date) => setLeadFollowUpDate(lead.id, date)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* + Add Stage column */}
        <div className="flex-shrink-0" style={{ width: 200 }}>
          {showAddStage ? (
            <div className="rounded-lg border p-3 space-y-2.5" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 15%)" }}>
              <p className="text-xs font-semibold" style={{ color: "oklch(0.80 0.005 250)" }}>New Stage</p>
              <input
                autoFocus
                value={newStageName}
                onChange={e => setNewStageName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddStage(); if (e.key === "Escape") setShowAddStage(false); }}
                placeholder="Stage name..."
                className="w-full text-sm px-2 py-1.5 rounded outline-none"
                style={{ background: "oklch(0.16 0.025 250)", color: "oklch(0.93 0.005 250)", border: "1px solid oklch(1 0 0 / 15%)" }}
              />
              <div>
                <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 250)" }}>Color</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewStageColor(c)}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                      style={{ background: c, outline: newStageColor === c ? "2px solid oklch(0.93 0.005 250)" : "none", outlineOffset: 2 }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddStage} className="flex-1 text-xs py-1.5 rounded font-medium" style={{ background: newStageColor, color: "oklch(0.13 0.025 250)" }}>Add</button>
                <button onClick={() => setShowAddStage(false)} className="flex-1 text-xs py-1.5 rounded" style={{ background: "oklch(0.16 0.025 250)", color: "oklch(0.55 0.01 250)" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddStage(true)}
              className="w-full h-16 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-80"
              style={{ borderColor: "oklch(1 0 0 / 15%)", color: "oklch(0.45 0.01 250)" }}
            >
              <Plus className="w-4 h-4" /> Add Stage
            </button>
          )}
        </div>
      </div>

      {/* Lost leads are intentionally separated from active pipeline operations. */}
      <section
        className="rounded-xl border overflow-hidden"
        style={{ background: dragOverStage === "Lost" ? "oklch(0.22 0.035 250)" : "oklch(0.17 0.025 250)", borderColor: dragOverStage === "Lost" ? "oklch(0.70 0.22 25 / 70%)" : "oklch(0.70 0.22 25 / 30%)" }}
        onDragOver={e => { e.preventDefault(); setDragOverStage("Lost"); }}
        onDragLeave={() => setDragOverStage(null)}
        onDrop={e => handleDrop(e, "Lost")}
      >
        <div className="px-5 py-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3" style={{ borderColor: "oklch(0.70 0.22 25 / 20%)", background: "oklch(0.60 0.22 25 / 8%)" }}>
          <div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: "oklch(0.70 0.22 25)" }} />
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.80 0.22 25)" }}>Lost Leads Review</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "oklch(0.70 0.22 25 / 18%)", color: "oklch(0.80 0.22 25)" }}>{lostLeads.length}</span>
            </div>
            <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>Separated from active work. Every newly lost lead requires a reason and supporting context.</p>
          </div>
          <Select value={lostReasonFilter} onValueChange={setLostReasonFilter}>
            <SelectTrigger className="w-full lg:w-60" style={{ background: "oklch(0.20 0.025 250)", borderColor: "oklch(0.70 0.22 25 / 35%)", color: "oklch(0.90 0.005 250)" }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ background: "oklch(0.20 0.025 250)", borderColor: "oklch(0.70 0.22 25 / 35%)" }}>
              <SelectItem value="All Reasons">All reasons</SelectItem>
              {lossReasonOptions.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-h-28">
          {lostLeadsForReview.length === 0 ? (
            <div className="col-span-full text-center py-7 text-sm" style={{ color: dragOverStage === "Lost" ? "oklch(0.80 0.22 25)" : "oklch(0.45 0.01 250)" }}>{dragOverStage === "Lost" ? "Drop here to record the required loss reason" : "No lost leads match this review filter."}</div>
          ) : lostLeadsForReview.map(lead => (
            <div key={lead.id} draggable onDragStart={e => handleDragStart(e, lead.id)} onDragEnd={handleDragEnd} style={{ cursor: "grab" }}>
              <LeadCard lead={lead} stageColor="oklch(0.70 0.22 25)" rescheduleCount={rescheduleCounts[lead.id] ?? 0} aiTier={aiTierMap[lead.id]} onOpenDetail={() => openDetail(lead)} onEdit={() => openEdit(lead)} onDelete={() => setLeadPendingDelete(lead)} onConvert={() => setConvertLead(lead)} onMarkDone={handleMarkDone} onReschedule={handleReschedule} onSetFollowUpDate={date => setLeadFollowUpDate(lead.id, date)} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Lead Detail Slide-Overr ──────────────────────────── */}
      {detailLeadId && (
        <LeadDetailPanel
          leadId={detailLeadId}
          onClose={() => setDetailLeadId(null)}
          onEditLead={openEdit}
          onConvertLead={lead => setConvertLead(lead)}
        />
      )}


      {/* ── Add/Edit Lead Modal ─────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={open => { if (!open) { setShowAdd(false); setEditLead(null); setSelectedClientId(null); setForm(emptyLead); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
              {editLead ? "Edit Lead" : "Add New Lead"}
            </DialogTitle>
            <DialogDescription className="sr-only">Search an existing person to auto-fill this lead form, or enter a new lead.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              {editLead ? (
                <>
                  <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Client Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name"
                    style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
                </>
              ) : (
                <ClientPicker
                  label="Client Name *"
                  value={form.name}
                  selectedLeadId={selectedClientId}
                  leads={leads}
                  payments={payments}
                  onValueChange={value => { setSelectedClientId(null); setForm(f => ({ ...f, name: value })); }}
                  onSelect={lead => { setSelectedClientId(lead.id); setForm(f => ({ ...f, name: lead.name, phone: lead.phone, email: lead.email, alienNumber: lead.alienNumber ?? "", dateOfBirth: lead.dateOfBirth ?? "", address: lead.address ?? "", preferredLanguage: lead.preferredLanguage ?? "", caseType: lead.caseType, caseNumber: lead.caseNumber, source: lead.source, referredBy: lead.referredBy, notes: lead.notes })); }}
                  placeholder="Search name, phone, A-number, or email"
                />
              )}
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
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>A-Number</Label>
              <Input value={form.alienNumber ?? ""} onChange={e => setForm(f => ({ ...f, alienNumber: e.target.value }))} placeholder="A# 215-XXX-XXX"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth ?? ""} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Current Address</Label>
              <Input value={form.address ?? ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, city, state, ZIP"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Preferred Language</Label>
              <Input value={form.preferredLanguage ?? ""} onChange={e => setForm(f => ({ ...f, preferredLanguage: e.target.value }))} placeholder="English, Punjabi, Spanish"
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
              <PSTDatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} inline />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Stage</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as LeadStage }))}>
                <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                  {pipelineStageNames.filter(s => editLead || s !== "Lost").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <LeadSourceField
                value={form.source}
                customValue={customSource}
                onChange={value => setForm(f => ({ ...f, source: value }))}
                onCustomValueChange={setCustomSource}
              />
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
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Consultation Fee</Label>
              <Input type="number" value={form.consultationFee || ""} onChange={e => setForm(f => ({ ...f, consultationFee: parseFloat(e.target.value) || 0 }))} placeholder="e.g. 150"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Assigned To {!editLead && <span style={{ color: "oklch(0.70 0.22 25)" }}>*</span>}</Label>
              <AssignedToSelect
                value={form.assignedTo ?? null}
                onChange={v => setForm(f => ({ ...f, assignedTo: v }))}
                required={!editLead}
              />
            </div>
            {!editLead && <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Next Follow-Up Date <span style={{ color: "oklch(0.70 0.22 25)" }}>*</span></Label>
              <PSTDatePicker value={form.followUpDate ?? ""} onChange={v => setForm(f => ({ ...f, followUpDate: v }))} minDate={todayPST()} inline />
            </div>}
          </div>
          <div className="mt-4">
            <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Case / Intake Notes</Label>
            <Textarea value={form.notes} onChange={event => setForm(f => ({ ...f, notes: event.target.value }))} rows={3} placeholder="Stored intake details and case notes"
              style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleSave} disabled={!editLead && (!form.assignedTo?.trim() || !form.followUpDate || form.followUpDate < todayPST())} style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>
              {editLead ? "Save Changes" : "Add Lead"}
            </Button>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditLead(null); setForm(emptyLead); }}
              style={{ borderColor: "oklch(1 0 0 / 20%)", color: "oklch(0.65 0.01 250)" }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Book Consultation Modal — payment is required before scheduling ── */}
      <Dialog open={!!consultationLead} onOpenChange={open => { if (!open) setConsultationLead(null); }}>
        <DialogContent style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 35%)", color: "oklch(0.93 0.005 250)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>Book Consultation</DialogTitle>
            <DialogDescription className="sr-only">Record the paid consultation fee and confirmed date before scheduling.</DialogDescription>
          </DialogHeader>
          <p className="text-sm" style={{ color: "oklch(0.65 0.01 250)" }}>Record the paid upfront fee, then select the confirmed consultation date. A consultation is not scheduled until the fee is paid.</p>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Consultation Fee Received *</Label>
              <div className="grid grid-cols-2 gap-2">
                {[150, 200].map(fee => <button key={fee} onClick={() => setConsultationForm(form => ({ ...form, fee: fee as 150 | 200 }))} className="rounded-lg py-2.5 text-sm font-semibold" style={{ background: consultationForm.fee === fee ? "oklch(0.72 0.12 75)" : "oklch(0.22 0.025 250)", color: consultationForm.fee === fee ? "oklch(0.13 0.025 250)" : "oklch(0.80 0.005 250)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}>{formatCurrency(fee)}</button>)}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Confirmed Consultation Date *</Label>
              <PSTDatePicker value={consultationForm.scheduledFor} onChange={date => setConsultationForm(form => ({ ...form, scheduledFor: date }))} minDate={todayPST()} inline />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Payment / booking note</Label>
              <Textarea value={consultationForm.notes} onChange={event => setConsultationForm(form => ({ ...form, notes: event.target.value }))} rows={2} placeholder="Optional receipt or booking note…" style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleBookConsultation} disabled={bookConsultationMut.isPending} style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}><Calendar className="w-4 h-4 mr-2" /> Record Payment & Book</Button>
            <Button variant="outline" onClick={() => setConsultationLead(null)} style={{ borderColor: "oklch(1 0 0 / 20%)", color: "oklch(0.65 0.01 250)" }}>Cancel</Button>
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
            {(convertLead?.consultationFee ?? 0) > 0 && convertLead?.consultationBookedDate && (
              <label className="flex items-start gap-3 rounded-lg p-3 cursor-pointer" style={{ background: "oklch(0.72 0.12 75 / 8%)", border: "1px solid oklch(0.72 0.12 75 / 22%)" }}>
                <input type="checkbox" checked={convertForm.applyConsultationFee} onChange={event => setConvertForm(form => ({ ...form, applyConsultationFee: event.target.checked }))} className="mt-1" />
                <span className="text-sm"><strong style={{ color: "oklch(0.72 0.12 75)" }}>Apply {formatCurrency(convertLead.consultationFee ?? 0)} consultation fee toward the retainer</strong><br /><span style={{ color: "oklch(0.60 0.01 250)" }}>If unchecked, the fee remains separate consultation revenue and does not reduce the retainer balance.</span></span>
              </label>
            )}
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

      <LeadDeleteDialog lead={leadPendingDelete} onClose={() => setLeadPendingDelete(null)} />

      <LostLeadDialog lead={lostLeadPending} onClose={() => { setLostLeadPending(null); setEditLead(null); setForm(emptyLead); }} />
    </div>
  );
}

// ── LeadCard Component (compact — click name to open detail panel) ──
type ChecklistTemplate = { id: string; stageId: string; label: string; description: string | null; order: number; createdAt: Date; };

function LeadCard({
  lead, stageTemplates = [], completedTemplateIds, stageColor: cardStageColor, rescheduleCount = 0, aiTier, onOpenDetail, onEdit, onDelete, onConvert, onBookConsultation, onMarkLost, onToggleChecklistCompletion, onMarkDone, onReschedule, onSetFollowUpDate,
}: {
  lead: Lead;
  stageTemplates?: ChecklistTemplate[];
  completedTemplateIds?: Set<string>;
  stageColor?: string;
  rescheduleCount?: number;
  aiTier?: { tier: string; score: number; headline: string };
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
  onBookConsultation?: () => void;
  onMarkLost?: () => void;
  onToggleChecklistCompletion?: (templateItemId: string, isCompleted: boolean) => void;
  onMarkDone: (fu: FollowUp) => void;
  onReschedule: (fu: FollowUp, newDate: string) => void;
  onSetFollowUpDate: (date: string | null) => void;
}) {
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [showFUDatePicker, setShowFUDatePicker] = useState(false);
  const [fuDateInput, setFUDateInput] = useState(lead.followUpDate ?? "");
  const [fuCalendarPosition, setFUCalendarPosition] = useState({ top: 0, left: 0 });
  const [showKanbanReschedule, setShowKanbanReschedule] = useState(false);
  const [pendingKanbanDate, setPendingKanbanDate] = useState<string>("");
  const fuDatePickerRef = useRef<HTMLDivElement>(null);
  const legacyChecklistInput = useMemo(() => ({ leadId: lead.id }), [lead.id]);
  const legacyChecklistQueryOptions = useMemo(
    () => ({ enabled: isConvertedStage(lead.stage) && stageTemplates.length === 0 }),
    [lead.stage, stageTemplates.length],
  );

  // Close date picker on outside click
  useEffect(() => {
    if (!showFUDatePicker) return;
    const handler = (e: MouseEvent) => {
      if (fuDatePickerRef.current && !fuDatePickerRef.current.contains(e.target as Node)) {
        setShowFUDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFUDatePicker]);
  const { payments: allPayments, followUps: allFollowUps, addLeadNote, setLeadFollowUpDate } = useCRM();
  const { activeMember } = useActiveMember();

  // ── Dynamic stage checklist (works for any stage with templates) ──────
  const hasTemplates = stageTemplates.length > 0;
  const completedIds = completedTemplateIds ?? new Set<string>();
  const completedCount = completedIds.size;
  const totalSteps = stageTemplates.length;
  const allDone = totalSteps > 0 && completedCount === totalSteps;

  // Legacy Onboarding checklist (for leads using the old onboarding_checklist table)
  const { data: legacyChecklistData, refetch: refetchLegacy } = trpc.onboarding.getByLead.useQuery(
    legacyChecklistInput,
    legacyChecklistQueryOptions,
  );
  const ONBOARDING_STEPS = [
    { key: "consultation_booked" as const, label: "Consultation Booked" },
    { key: "case_notes_created" as const, label: "Case Notes Created" },
    { key: "task_added_cerenade" as const, label: "Task Added in Cerenade" },
    { key: "task_added_planner" as const, label: "Task Added in Planner" },
  ];
  const toggleStepMut = trpc.onboarding.toggleStep.useMutation({ onSuccess: () => refetchLegacy() });
  const legacyCompletedSteps = new Set((legacyChecklistData ?? []).filter(c => c.completedAt).map(c => c.step));
  const legacyAllDone = legacyCompletedSteps.size === 4;

  const handleToggleStep = useCallback((step: "consultation_booked" | "case_notes_created" | "task_added_cerenade" | "task_added_planner") => {
    const isCompleted = legacyCompletedSteps.has(step);
    toggleStepMut.mutate({
      leadId: lead.id,
      step,
      completedAt: isCompleted ? null : new Date().toISOString(),
      completedBy: isCompleted ? null : (activeMember?.name ?? "Staff"),
    });
  }, [legacyCompletedSteps, lead.id, activeMember, toggleStepMut]);

  const handleToggleCompletion = (templateItemId: string) => {
    onToggleChecklistCompletion?.(templateItemId, completedIds.has(templateItemId));
  };
  const totalReceived = allPayments
    .filter(payment => payment.leadId === lead.id)
    .filter(payment => lead.consultationFeeAppliedToRetainer || payment.receivedFor !== "Consultation Fee")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = lead.retainerBooked > 0 ? lead.retainerBooked - totalReceived : 0;
  const pct = lead.retainerBooked > 0 ? Math.min(100, (totalReceived / lead.retainerBooked) * 100) : 0;
  const paidFull = lead.retainerBooked > 0 && totalReceived >= lead.retainerBooked;
  // isOverdue: follow-up date is set and is in the past
  const isOverdue = !!lead.followUpDate && lead.followUpDate < todayPST();

  return (
    <div
      onClick={onOpenDetail}
      className="rounded-lg border p-3 transition-all cursor-pointer hover:border-white/20 hover:bg-[oklch(0.21_0.025_250)]"
      style={{
        background: "oklch(0.19 0.025 250)",
        borderColor: isOverdue ? "oklch(0.60 0.22 25 / 60%)" : rescheduleCount > 2 ? "oklch(0.75 0.18 75 / 40%)" : "oklch(1 0 0 / 8%)",
        borderLeftWidth: "3px",
        borderLeftColor: isOverdue ? "oklch(0.65 0.22 25)" : rescheduleCount > 2 ? "oklch(0.75 0.18 75)" : "oklch(0.72 0.12 75 / 40%)",
      }}
    >
      {/* Card header */}
      <div className={lead.stage === "Lost" ? "flex flex-col gap-2" : "flex items-start justify-between gap-2"}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Clickable name opens detail panel */}
            <span
              className="font-medium text-sm text-left"
              style={{ color: "oklch(0.93 0.005 250)" }}
            >
              {lead.name}
            </span>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "oklch(0.65 0.01 250)" }} onClick={e => { e.stopPropagation(); }}>
                <Phone className="w-3 h-3" />{lead.phone}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{lead.caseType}</span>
            {lead.caseNumber && <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>#{lead.caseNumber}</span>}
            <LeadAgeBadge dateStr={lead.date} />
            {aiTier && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                title={`AI Score: ${aiTier.score}/10 — ${aiTier.headline}`}
                style={{
                  background: aiTier.tier === "Hot" ? "oklch(0.55 0.22 25 / 20%)" :
                              aiTier.tier === "Warm" ? "oklch(0.65 0.18 75 / 20%)" :
                              aiTier.tier === "At-Risk" ? "oklch(0.60 0.20 50 / 20%)" :
                              "oklch(0.40 0.01 250 / 30%)",
                  color: aiTier.tier === "Hot" ? "oklch(0.75 0.22 25)" :
                         aiTier.tier === "Warm" ? "oklch(0.80 0.18 75)" :
                         aiTier.tier === "At-Risk" ? "oklch(0.75 0.20 50)" :
                         "oklch(0.55 0.01 250)",
                  border: `1px solid ${aiTier.tier === "Hot" ? "oklch(0.55 0.22 25 / 40%)" :
                                       aiTier.tier === "Warm" ? "oklch(0.65 0.18 75 / 40%)" :
                                       aiTier.tier === "At-Risk" ? "oklch(0.60 0.20 50 / 40%)" :
                                       "oklch(0.40 0.01 250 / 40%)"}`,
                }}
              >
                {aiTier.tier === "Hot" ? "🔥" : aiTier.tier === "Warm" ? "⚡" : aiTier.tier === "At-Risk" ? "⚠️" : "❄️"} {aiTier.tier}
              </span>
            )}
            {lead.stage === "Lost" && lead.lostReason && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.60 0.22 25 / 12%)", color: "oklch(0.70 0.22 25)" }}>
                {lead.lostReason}
              </span>
            )}

            {lead.notes && (
              <span className="text-xs italic truncate max-w-[180px]" style={{ color: "oklch(0.45 0.01 250)" }} title={lead.notes}>
                {lead.notes.length > 60 ? lead.notes.slice(0, 60) + "\u2026" : lead.notes}
              </span>
            )}
            {lead.assignedTo && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                title={`Assigned to ${lead.assignedTo}`}
                style={{ background: "oklch(0.55 0.18 250 / 18%)", color: "oklch(0.72 0.12 250)", border: "1px solid oklch(0.55 0.18 250 / 35%)" }}
              >
                {lead.assignedTo.split(" ")[0]}
              </span>
            )}
          </div>
        </div>

        {lead.stage === "Lost" && (
          <div className="w-full min-w-0 mt-0 rounded-md px-2.5 py-2" style={{ background: "oklch(0.60 0.22 25 / 8%)", border: "1px solid oklch(0.60 0.22 25 / 20%)", overflowWrap: "anywhere" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.72 0.22 25)" }}>Loss review</span>
              {lead.lostDate && <span className="text-[10px]" style={{ color: "oklch(0.50 0.01 250)" }}>{formatDate(lead.lostDate)}</span>}
            </div>
            <p className="text-xs mt-1" style={{ color: "oklch(0.78 0.01 250)" }}>{lead.lostNote || "Legacy record: supporting context was not recorded."}</p>
          </div>
        )}

        {/* Reschedule warning badge — shown when rescheduled more than twice */}
        {rescheduleCount > 2 && (
          <div
            className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full w-fit"
            style={{
              background: "oklch(0.75 0.18 75 / 15%)",
              border: "1px solid oklch(0.75 0.18 75 / 40%)",
            }}
            title={`Rescheduled ${rescheduleCount} times — review this lead`}
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: "oklch(0.75 0.18 75)" }} />
            <span className="text-[10px] font-semibold" style={{ color: "oklch(0.75 0.18 75)" }}>
              Rescheduled {rescheduleCount}×
            </span>
          </div>
        )}
      </div>

      {/* ── Checklist Progress Bar (visible on all cards with stage templates) ── */}
      {hasTemplates && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Steps</span>
            {allDone ? (
              <span className="text-xs font-semibold" style={{ color: "oklch(0.55 0.18 145)" }}>✓ All done</span>
            ) : (
              <span className="text-xs font-medium" style={{ color: "oklch(0.65 0.01 250)" }}>{completedCount}/{totalSteps} steps</span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0}%`,
                background: allDone
                  ? "oklch(0.55 0.18 145)"
                  : (cardStageColor ?? "oklch(0.65 0.18 200)"),
              }}
            />
          </div>
        </div>
      )}



      {/* ── Follow-Up Date (popup date picker) ── */}
      <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.65 0.20 300)" }} />
        <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Follow-up:</span>
        <div ref={fuDatePickerRef} className="relative">
          <button
            onClick={e => {
              e.stopPropagation();
              setFUDateInput(lead.followUpDate ?? "");
              if (!showFUDatePicker) {
                const rect = fuDatePickerRef.current?.getBoundingClientRect();
                const calendarHeight = 350;
                const calendarWidth = 240;
                const top = rect && rect.bottom + calendarHeight + 8 > window.innerHeight
                  ? Math.max(8, rect.top - calendarHeight - 8)
                  : (rect?.bottom ?? 0) + 8;
                const left = rect ? Math.min(Math.max(8, rect.left), window.innerWidth - calendarWidth - 8) : 8;
                setFUCalendarPosition({ top, left });
              }
              setShowFUDatePicker(p => !p);
            }}
            className="text-xs px-2 py-0.5 rounded border transition-colors hover:opacity-90"
            style={{
              background: "oklch(0.22 0.025 250)",
              borderColor: lead.followUpDate ? "oklch(0.65 0.20 300 / 60%)" : "oklch(0.65 0.20 300 / 30%)",
              color: lead.followUpDate ? "oklch(0.85 0.005 250)" : "oklch(0.50 0.01 250)",
            }}
          >
            {lead.followUpDate ? formatDate(lead.followUpDate) : "Set date"}
          </button>

          {showFUDatePicker && (
            <div
              className="fixed z-[70] rounded-xl shadow-2xl p-2.5 w-[240px]"
              style={{
                top: fuCalendarPosition.top,
                left: fuCalendarPosition.left,
                background: "oklch(0.18 0.025 250)",
                border: "1px solid oklch(1 0 0 / 14%)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.72 0.12 75)" }}>
                Set follow-up date
              </p>
              {/* PST-safe calendar — no native date input */}
              <PSTDatePicker value={fuDateInput} onChange={setFUDateInput} inline compact />
              <div className="flex gap-2">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (!fuDateInput) return;
                    setShowFUDatePicker(false);
                    if (lead.followUpDate && lead.followUpDate !== fuDateInput) {
                      // Changing an existing date — require a reason note
                      setPendingKanbanDate(fuDateInput);
                      setShowKanbanReschedule(true);
                    } else {
                      // First-time set — allow directly
                      onSetFollowUpDate(fuDateInput);
                      toast.success(`Follow-up set to ${formatDate(fuDateInput)}`);
                    }
                  }}
                  disabled={!fuDateInput}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}
                >
                  Confirm
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setShowFUDatePicker(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ background: "oklch(0.25 0.025 250)", color: "oklch(0.55 0.01 250)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        {lead.followUpDate && (
          <button
            onClick={e => { e.stopPropagation(); onSetFollowUpDate(null); }}
            className="text-xs hover:opacity-70"
            style={{ color: "oklch(0.50 0.01 250)" }}
            title="Clear follow-up date"
          >✕</button>
        )}
      </div>

      {/* Consultation fee + quoted amount (Consultation / Follow-Up stages) */}
      {(lead.stage === "Consultation" || lead.stage === "Follow-Up") && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {(lead.consultationFee ?? 0) > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 25%)" }}>
              Consult: {formatCurrency(lead.consultationFee!)}
            </span>
          )}
          {(lead.quotedAmount ?? 0) > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "oklch(0.65 0.20 300 / 12%)", color: "oklch(0.70 0.15 300)", border: "1px solid oklch(0.65 0.20 300 / 25%)" }}>
              Quoted: {formatCurrency(lead.quotedAmount)}
            </span>
          )}
        </div>
      )}

      {/* Dynamic Stage Checklist (any stage with templates) */}
      {hasTemplates && (
        <div className="mt-2.5 rounded-lg p-2.5" style={{ background: "oklch(0.22 0.03 200 / 40%)", border: "1px solid oklch(0.65 0.18 200 / 25%)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: "oklch(0.65 0.18 200)" }}>Checklist</span>
            {allDone ? (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 40%)" }}>✓ Complete</span>
            ) : (
              <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>{completedCount}/{totalSteps}</span>
            )}
          </div>
          <div className="h-1 rounded-full mb-2.5 overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0}%`, background: allDone ? "oklch(0.55 0.18 145)" : "oklch(0.65 0.18 200)" }} />
          </div>
          <div className="space-y-1.5">
            {stageTemplates.map(t => {
              const done = completedIds.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={e => { e.stopPropagation(); handleToggleCompletion(t.id); }}
                  className="w-full flex items-center gap-2 text-left transition-opacity hover:opacity-80"
                >
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.55 0.18 145)" }} />
                    : <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.40 0.01 250)" }} />
                  }
                  <span className="text-xs flex-1" style={{ color: done ? "oklch(0.55 0.01 250)" : "oklch(0.80 0.005 250)", textDecoration: done ? "line-through" : "none" }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legacy Onboarding Checklist (Retained & Onboarding stage, no templates yet) */}
      {isConvertedStage(lead.stage) && !hasTemplates && (
        <div className="mt-2.5 rounded-lg p-2.5" style={{ background: "oklch(0.22 0.03 200 / 40%)", border: "1px solid oklch(0.65 0.18 200 / 25%)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: "oklch(0.65 0.18 200)" }}>Onboarding Checklist</span>
            {legacyAllDone ? (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 40%)" }}>✓ Onboarding Complete</span>
            ) : (
              <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>{legacyCompletedSteps.size}/4</span>
            )}
          </div>
          <div className="h-1 rounded-full mb-2.5 overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(legacyCompletedSteps.size / 4) * 100}%`, background: legacyAllDone ? "oklch(0.55 0.18 145)" : "oklch(0.65 0.18 200)" }} />
          </div>
          <div className="space-y-1.5">
            {ONBOARDING_STEPS.map(({ key, label }) => {
              const done = legacyCompletedSteps.has(key);
              const stepData = (legacyChecklistData ?? []).find(c => c.step === key && c.completedAt);
              return (
                <button
                  key={key}
                  onClick={e => { e.stopPropagation(); handleToggleStep(key); }}
                  className="w-full flex items-center gap-2 text-left transition-opacity hover:opacity-80"
                  disabled={toggleStepMut.isPending}
                >
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.55 0.18 145)" }} />
                    : <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.40 0.01 250)" }} />
                  }
                  <span className="text-xs flex-1" style={{ color: done ? "oklch(0.55 0.01 250)" : "oklch(0.80 0.005 250)", textDecoration: done ? "line-through" : "none" }}>{label}</span>
                  {done && stepData?.completedBy && (
                    <span className="text-xs flex-shrink-0" style={{ color: "oklch(0.45 0.01 250)" }}>{stepData.completedBy}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Retainer progress (converted clients) */}
      {isConvertedStage(lead.stage) && lead.retainerBooked > 0 && (
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
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        {!isConvertedStage(lead.stage) && lead.stage !== "Lost" && lead.stage !== "Consultation Booked" && onBookConsultation && (
          <button onClick={e => { e.stopPropagation(); onBookConsultation(); }} className="flex min-w-0 flex-1 basis-[calc(50%-0.375rem)] items-center justify-center gap-1 text-center text-xs px-2 py-1 rounded font-medium leading-tight transition-colors"
            style={{ background: "oklch(0.72 0.12 75 / 16%)", color: "oklch(0.76 0.14 75)", border: "1px solid oklch(0.72 0.12 75 / 35%)" }}>
            <Calendar className="w-3 h-3" /> Book Consultation
          </button>
        )}
        {!isConvertedStage(lead.stage) && lead.stage !== "Lost" && (
          <button onClick={e => { e.stopPropagation(); onConvert(); }} className="flex min-w-0 flex-1 basis-[calc(50%-0.375rem)] items-center justify-center gap-1 text-center text-xs px-2 py-1 rounded font-medium leading-tight transition-colors"
            style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}>
            <CheckCircle className="w-3 h-3" /> Convert
          </button>
        )}
        {!isConvertedStage(lead.stage) && lead.stage !== "Lost" && onMarkLost && (
          <button
            onClick={e => { e.stopPropagation(); onMarkLost(); }}
            className="flex min-w-0 flex-1 basis-[calc(50%-0.375rem)] items-center justify-center gap-1 text-center text-xs px-2 py-1 rounded font-medium leading-tight transition-colors hover:opacity-90"
            title="Mark this lead as lost and record the required reason"
            style={{ background: "oklch(0.60 0.22 25 / 15%)", color: "oklch(0.72 0.22 25)", border: "1px solid oklch(0.60 0.22 25 / 35%)" }}
          >
            <AlertCircle className="w-3 h-3" /> Mark Lost
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="shrink-0 p-1.5 rounded transition-colors hover:bg-white/8" title="Edit lead" style={{ color: "oklch(0.72 0.12 75)" }}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="shrink-0 p-1.5 rounded transition-colors hover:bg-red-500/10" title="Delete lead" style={{ color: "oklch(0.65 0.18 25)" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Kanban Reschedule Modal — mandatory reason note */}
      {showKanbanReschedule && pendingKanbanDate && (
        <KanbanRescheduleModal
          lead={lead}
          initialDate={pendingKanbanDate}
          onConfirm={async (note: string, newDate: string) => {
            setShowKanbanReschedule(false);
            const memberName = activeMember?.name ?? "Team";
            const rescheduledOn = nowDateTimePST();
            const auditNote = `${note}\n__RESCHEDULE__:${memberName}:${rescheduledOn}:${newDate}`;
            await addLeadNote(lead.id, auditNote, activeMember?.name ?? undefined);
            await setLeadFollowUpDate(lead.id, newDate);
            toast.success(`Rescheduled to ${formatDate(newDate)} — reason logged`);
          }}
          onCancel={() => setShowKanbanReschedule(false)}
        />
      )}
    </div>
  );
}

// ── KanbanRescheduleModal ─────────────────────────────────────
// Shown when a Kanban card date picker tries to change an existing followUpDate.
// Forces the user to enter a reason before the change is saved.
function KanbanRescheduleModal({
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 70%)" }}
      onClick={e => { e.stopPropagation(); onCancel(); }}
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
          <PSTDatePicker value={newDate} onChange={setNewDate} inline />
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
