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
import { useLocation } from "wouter";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { isConvertedStage, isActiveLeadStage } from "@shared/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
function AssignedToSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { data: members = [] } = trpc.members.list.useQuery();
  return (
    <Select value={value ?? "__unassigned__"} onValueChange={v => onChange(v === "__unassigned__" ? null : v)}>
      <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
        <SelectItem value="__unassigned__">Unassigned</SelectItem>
        {members.map((m: { id: string; name: string }) => (
          <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const emptyLead: Omit<Lead, "id"> = {
  name: "", phone: "", email: "", caseType: "DA", caseNumber: "", source: "",
  stage: "New Lead", notes: "", date: todayPST(),
  retainerBooked: 0, downpayment: 0, quotedAmount: 0, referredBy: "", consultationFee: 0,
  assignedTo: "Khushi",
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
  const { leads, payments, followUps, addLead, updateLead, deleteLead, addPayment, updateFollowUp, addFollowUp, setLeadFollowUpDate } = useCRM();
  const { activeMember } = useActiveMember();
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Omit<Lead, "id">>(emptyLead);
  const [convertForm, setConvertForm] = useState({ retainerBooked: "", downpayment: "", caseNumber: "", notes: "" });
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "All">("All");
  const [filterCaseType, setFilterCaseType] = useState<string>("All");
  const [lostLeadPending, setLostLeadPending] = useState<Lead | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [lostReasonCustom, setLostReasonCustom] = useState("");

  // ── Lead Detail Slide-Over ─────────────────────────────────
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [location] = useLocation();

  // Auto-open lead panel when navigated to /leads?lead=ID (e.g. from global search)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("lead");
    if (leadId) {
      setDetailLeadId(leadId);
      // Clean the URL so refreshing doesn't re-open the panel
      window.history.replaceState({}, "", "/leads");
    }
  }, [location]);

  // ── Month selector for the summary card ─────────────────
  const nowPST = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const [summaryMonth, setSummaryMonth] = useState(() => parseInt(nowPST.split("-")[1]));
  const [summaryYear, setSummaryYear] = useState(() => parseInt(nowPST.split("-")[0]));
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // ── Dynamic pipeline stages from DB ──────────────────────
  const { data: dbStages = [] } = trpc.pipeline.getStages.useQuery();
  const { data: allChecklistTemplates = [] } = trpc.pipeline.getAllChecklistTemplates.useQuery();

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

  // ── Bifurcation stats (all-time + monthly) ─────────────────────
  const allTimeActive = useMemo(() => leads.filter(l => isActiveLeadStage(l.stage)).length, [leads]);
  const allTimeConverted = useMemo(() => leads.filter(l => isConvertedStage(l.stage)).length, [leads]);
  const allTimeLost = useMemo(() => leads.filter(l => l.stage === "Lost").length, [leads]);
  const allTimeTotal = allTimeActive + allTimeConverted + allTimeLost;
  const allTimeConvRate = allTimeTotal > 0 ? Math.round((allTimeConverted / allTimeTotal) * 100) : 0;

  const monthLeadsIn = useMemo(() => leads.filter(l => {
    const d = new Date(l.date + "T12:00:00");
    return d.getFullYear() === summaryYear && d.getMonth() + 1 === summaryMonth;
  }), [leads, summaryYear, summaryMonth]);
  const monthConverted = useMemo(() => leads.filter(l => {
    if (!isConvertedStage(l.stage)) return false;
    const dateToCheck = l.convertedDate || l.date;
    const d = new Date(dateToCheck + "T12:00:00");
    return d.getFullYear() === summaryYear && d.getMonth() + 1 === summaryMonth;
  }), [leads, summaryYear, summaryMonth]);
  const monthLost = useMemo(() => leads.filter(l => {
    if (l.stage !== "Lost") return false;
    const d = new Date(l.date + "T12:00:00");
    return d.getFullYear() === summaryYear && d.getMonth() + 1 === summaryMonth;
  }), [leads, summaryYear, summaryMonth]);
  const monthConvRate = monthLeadsIn.length > 0 ? Math.round((monthConverted.length / monthLeadsIn.length) * 100) : 0;

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search) || l.caseNumber.toLowerCase().includes(search.toLowerCase());
      const matchStage = filterStage === "All" || l.stage === filterStage;
      const matchCase = filterCaseType === "All" || l.caseType === filterCaseType;
      return matchSearch && matchStage && matchCase;
    });
  }, [leads, search, filterStage, filterCaseType]);

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

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === targetStage) { setDragOverStage(null); return; }
    if (targetStage === "Lost" && lead.stage !== "Lost") {
      setLostLeadPending(lead);
      setLostReason("");
      setLostReasonCustom("");
    } else if (targetStage === "Retained & Onboarding" && !isConvertedStage(lead.stage)) {
      // Only trigger Convert modal if the lead is NOT already a converted client.
      setConvertLead(lead);
      setConvertForm({ retainerBooked: "", downpayment: "", caseNumber: lead.caseNumber || "", notes: "" });
    } else {
      updateLead(leadId, { stage: targetStage });
      toast.success(`Moved to ${targetStage}`);
      // Auto-log consultation fee as a payment when moving to Consultation (if fee > 0 and not already logged)
      if (targetStage === "Consultation" && (lead.consultationFee ?? 0) > 0) {
        const alreadyLogged = payments.some(p => p.leadId === leadId && p.receivedFor === "Consultation Fee");
        if (!alreadyLogged) {
          addPayment({
            date: todayPST(),
            clientName: lead.name,
            leadId,
            caseType: lead.caseType,
            caseNumber: lead.caseNumber,
            paymentType: "New Client",
            amount: lead.consultationFee!,
            receivedFor: "Consultation Fee",
            notes: "",
          });
          toast.info(`Consultation fee $${lead.consultationFee} logged as payment`);
        }
      }
      // Auto-create a follow-up task when a lead moves to Consultation or Follow-Up with no pending tasks
      if (targetStage === "Consultation" || targetStage === "Follow-Up") {
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

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (editLead) {
      // If changing to Lost stage, prompt for reason
      if (form.stage === "Lost" && editLead.stage !== "Lost") {
        setLostLeadPending({ ...editLead, ...form } as Lead);
        setLostReason("");
        setLostReasonCustom("");
        setShowAdd(false);
        return;
      }
      // Exclude 'notes' from edit dialog updates — case notes are only editable
      // from the LeadDetailPanel dedicated notes editor to prevent accidental wipes.
      const { notes: _notes, ...formWithoutNotes } = form;
      updateLead(editLead.id, formWithoutNotes);
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
      addLead(form);
      toast.success("Lead added");
      setShowAdd(false);
    }
    setForm(emptyLead);
  };

  const handleConfirmLost = () => {
    if (!lostLeadPending) return;
    const reason = lostReason === "Other" ? lostReasonCustom : lostReason;
    const { notes: _lostNotes, ...formWithoutNotes } = form;
    updateLead(lostLeadPending.id, { ...formWithoutNotes, stage: "Lost", lostReason: reason || undefined });
    toast.success(`${lostLeadPending.name} marked as Lost`);
    setLostLeadPending(null);
    setLostReason("");
    setLostReasonCustom("");
    setEditLead(null);
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
            {allTimeTotal} total · {allTimeActive} active · {allTimeConverted} converted · {allTimeLost} lost
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
            {pipelineStageNames.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                ({leads.filter(l => l.caseType === ct).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Lead Bifurcation Summary Card ─────────────────────── */}
      <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.16 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 25%)" }}>
        {/* Header row with month navigator */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Pipeline Overview</span>
          </div>
          {/* Month navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (summaryMonth === 1) { setSummaryMonth(12); setSummaryYear(y => y - 1); }
                else setSummaryMonth(m => m - 1);
              }}
              className="p-1 rounded hover:bg-white/8 transition-colors"
              style={{ color: "oklch(0.55 0.01 250)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-xs font-medium w-20 text-center" style={{ color: "oklch(0.75 0.01 250)" }}>
              {MONTHS_SHORT[summaryMonth - 1]} {summaryYear}
            </span>
            <button
              onClick={() => {
                if (summaryMonth === 12) { setSummaryMonth(1); setSummaryYear(y => y + 1); }
                else setSummaryMonth(m => m + 1);
              }}
              className="p-1 rounded hover:bg-white/8 transition-colors"
              style={{ color: "oklch(0.55 0.01 250)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        {/* Two-column layout: Monthly | All-Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          {/* Monthly column */}
          <div className="px-5 py-4" style={{ borderRight: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.55 0.01 250)" }}>
              {MONTHS_SHORT[summaryMonth - 1]} {summaryYear} — This Month
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
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ minHeight: 400 }}>
        {/* Close gear popover when clicking outside */}
        {openGearStageId && (
          <div className="fixed inset-0 z-40" onClick={() => { setOpenGearStageId(null); setDeleteConfirmStageId(null); }} />
        )}

        {pipelineStageNames.map(stage => {
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
                    style={{ cursor: "grab" }}
                  >
                    <LeadCard
                      lead={lead}
                      stageTemplates={stageTemplates}
                      stageColor={color}
                      rescheduleCount={rescheduleCounts[lead.id] ?? 0}
                      aiTier={aiTierMap[lead.id]}
                      onOpenDetail={() => openDetail(lead)}
                      onEdit={() => openEdit(lead)}
                      onDelete={() => { deleteLead(lead.id); toast.success("Lead deleted"); }}
                      onConvert={() => setConvertLead(lead)}
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
              <PSTDatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} inline />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Stage</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as LeadStage }))}>
                <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                  {pipelineStageNames.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Source</Label>
              <Select value={form.source || ""} onValueChange={val => setForm(f => ({ ...f, source: val === "__other__" ? "" : val }))}>
                <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: form.source ? "oklch(0.93 0.005 250)" : "oklch(0.45 0.01 250)" }}>
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
                  {["Referral", "Existing Client", "Google", "Facebook", "Instagram", "Website", "Walk-In", "Handler", "Other"].map(opt => (
                    <SelectItem key={opt} value={opt} style={{ color: "oklch(0.93 0.005 250)" }}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Assigned To</Label>
              <AssignedToSelect
                value={form.assignedTo ?? null}
                onChange={v => setForm(f => ({ ...f, assignedTo: v }))}
              />
            </div>
          </div>
          {/* Note: Case notes are edited from the Lead Detail Panel, not here, to prevent accidental overwrites */}
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

      {/* ── Lost Lead Reason Modal ───────────────────── */}
      <Dialog open={!!lostLeadPending} onOpenChange={open => { if (!open) { setLostLeadPending(null); setLostReason(""); setLostReasonCustom(""); } }}>
        <DialogContent style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.70 0.22 25 / 40%)", color: "oklch(0.93 0.005 250)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
              Mark {lostLeadPending?.name} as Lost
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-1" style={{ color: "oklch(0.60 0.01 250)" }}>Please select a reason so we can track why leads are not converting.</p>
          {/* Revenue summary for this lead */}
          {(lostLeadPending?.consultationFee ?? 0) > 0 || (lostLeadPending?.quotedAmount ?? 0) > 0 ? (
            <div className="mt-3 rounded-lg px-3 py-2.5 flex flex-col gap-1" style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 10%)" }}>
              <p className="text-xs font-semibold" style={{ color: "oklch(0.65 0.01 250)" }}>Revenue Summary</p>
              {(lostLeadPending?.consultationFee ?? 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: "oklch(0.60 0.01 250)" }}>Consultation fee collected</span>
                  <span className="font-medium" style={{ color: "oklch(0.72 0.12 75)" }}>${(lostLeadPending?.consultationFee ?? 0).toLocaleString()}</span>
                </div>
              )}
              {(lostLeadPending?.quotedAmount ?? 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: "oklch(0.60 0.01 250)" }}>Quoted retainer (not collected)</span>
                  <span className="font-medium" style={{ color: "oklch(0.55 0.01 250)" }}>${(lostLeadPending?.quotedAmount ?? 0).toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : null}
          <div className="space-y-2 mt-3">
            {["Price too high", "Chose competitor", "Not qualified", "No response", "Changed mind", "Other"].map(r => (
              <button
                key={r}
                onClick={() => setLostReason(r)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  background: lostReason === r ? "oklch(0.70 0.22 25 / 20%)" : "oklch(0.22 0.025 250)",
                  border: lostReason === r ? "1px solid oklch(0.70 0.22 25 / 60%)" : "1px solid oklch(1 0 0 / 8%)",
                  color: lostReason === r ? "oklch(0.80 0.22 25)" : "oklch(0.75 0.01 250)",
                }}
              >{r}</button>
            ))}
            {lostReason === "Other" && (
              <Input
                value={lostReasonCustom}
                onChange={e => setLostReasonCustom(e.target.value)}
                placeholder="Describe the reason..."
                autoFocus
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}
              />
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleConfirmLost}
              disabled={!lostReason || (lostReason === "Other" && !lostReasonCustom.trim())}
              style={{ background: "oklch(0.60 0.22 25)", color: "oklch(0.98 0 0)" }}
            >
              Confirm Lost
            </Button>
            <Button variant="outline" onClick={() => { setLostLeadPending(null); setLostReason(""); setLostReasonCustom(""); }}
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
type ChecklistTemplate = { id: string; stageId: string; label: string; description: string | null; order: number; createdAt: Date; };

function LeadCard({
  lead, stageTemplates = [], stageColor: cardStageColor, rescheduleCount = 0, aiTier, onOpenDetail, onEdit, onDelete, onConvert, onMarkDone, onReschedule, onSetFollowUpDate,
}: {
  lead: Lead;
  stageTemplates?: ChecklistTemplate[];
  stageColor?: string;
  rescheduleCount?: number;
  aiTier?: { tier: string; score: number; headline: string };
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
  onMarkDone: (fu: FollowUp) => void;
  onReschedule: (fu: FollowUp, newDate: string) => void;
  onSetFollowUpDate: (date: string | null) => void;
}) {
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [showFUDatePicker, setShowFUDatePicker] = useState(false);
  const [fuDateInput, setFUDateInput] = useState(lead.followUpDate ?? "");
  const [showKanbanReschedule, setShowKanbanReschedule] = useState(false);
  const [pendingKanbanDate, setPendingKanbanDate] = useState<string>("");
  const fuDatePickerRef = useRef<HTMLDivElement>(null);

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
  const utils = trpc.useUtils();
  const { data: completionData, refetch: refetchCompletions } = trpc.pipeline.getCompletions.useQuery(
    { leadId: lead.id },
    { enabled: hasTemplates }
  );
  const toggleCompletionMut = trpc.pipeline.toggleCompletion.useMutation({
    onSuccess: () => { refetchCompletions(); utils.pipeline.getCompletions.invalidate({ leadId: lead.id }); }
  });
  const completedTemplateIds = new Set((completionData ?? []).filter(c => c.completedAt).map(c => c.templateItemId));
  const completedCount = completedTemplateIds.size;
  const totalSteps = stageTemplates.length;
  const allDone = totalSteps > 0 && completedCount === totalSteps;

  // Legacy Onboarding checklist (for leads using the old onboarding_checklist table)
  const { data: legacyChecklistData, refetch: refetchLegacy } = trpc.onboarding.getByLead.useQuery(
    { leadId: lead.id },
    { enabled: isConvertedStage(lead.stage) && !hasTemplates }
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

  const handleToggleCompletion = useCallback((templateItemId: string) => {
    const isCompleted = completedTemplateIds.has(templateItemId);
    toggleCompletionMut.mutate({
      leadId: lead.id,
      templateItemId,
      completedAt: isCompleted ? null : new Date().toISOString(),
      completedBy: isCompleted ? null : (activeMember?.name ?? "Staff"),
    });
  }, [completedTemplateIds, lead.id, activeMember, toggleCompletionMut]);
  const totalReceived = allPayments.filter(p => p.leadId === lead.id).reduce((s, p) => s + p.amount, 0);
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
      <div className="flex items-start justify-between gap-2">
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
            onClick={e => { e.stopPropagation(); setFUDateInput(lead.followUpDate ?? ""); setShowFUDatePicker(p => !p); }}
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
              className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-2xl p-3 min-w-[220px]"
              style={{
                background: "oklch(0.18 0.025 250)",
                border: "1px solid oklch(1 0 0 / 14%)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.72 0.12 75)" }}>
                Set follow-up date
              </p>
              {/* PST-safe calendar — no native date input */}
              <PSTDatePicker value={fuDateInput} onChange={setFUDateInput} inline />
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
              const done = completedTemplateIds.has(t.id);
              const comp = (completionData ?? []).find(c => c.templateItemId === t.id && c.completedAt);
              return (
                <button
                  key={t.id}
                  onClick={e => { e.stopPropagation(); handleToggleCompletion(t.id); }}
                  className="w-full flex items-center gap-2 text-left transition-opacity hover:opacity-80"
                  disabled={toggleCompletionMut.isPending}
                >
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.55 0.18 145)" }} />
                    : <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.40 0.01 250)" }} />
                  }
                  <span className="text-xs flex-1" style={{ color: done ? "oklch(0.55 0.01 250)" : "oklch(0.80 0.005 250)", textDecoration: done ? "line-through" : "none" }}>{t.label}</span>
                  {done && comp?.completedBy && (
                    <span className="text-xs flex-shrink-0" style={{ color: "oklch(0.45 0.01 250)" }}>{comp.completedBy}</span>
                  )}
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
      <div className="flex items-center gap-2 mt-2.5">
        {!isConvertedStage(lead.stage) && lead.stage !== "Lost" && (
          <button onClick={e => { e.stopPropagation(); onConvert(); }} className="flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors"
            style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}>
            <CheckCircle className="w-3 h-3" /> Convert
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded transition-colors hover:bg-white/8" title="Edit lead" style={{ color: "oklch(0.72 0.12 75)" }}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded transition-colors hover:bg-red-500/10" title="Delete lead" style={{ color: "oklch(0.65 0.18 25)" }}>
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
