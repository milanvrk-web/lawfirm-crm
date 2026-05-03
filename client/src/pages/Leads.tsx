/* ============================================================
   Law Firm CRM — Leads Page
   Design: Dark luxury navy/gold — Playfair Display headings
   Features:
     - Kanban pipeline (New Lead / Consultation / Retained / Lost)
     - Add / Edit / Delete leads
     - Convert lead → Retained with retainer + downpayment
     - Retainer progress bar per retained lead
     - Follow-up strip on card: next due date, one-tap Done/Snooze
     - Overdue red border highlight
     - Combined Activity panel: Note tab + Follow-Up tab
     - Pending follow-up count badge on activity button
   ============================================================ */
import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import {
  type Lead, type LeadStage, type CaseType, type FollowUp,
  formatCurrency, formatDate, getLeadTotalReceived, getLeadFollowUps
} from "@/lib/store";
import { toast } from "sonner";
import {
  Plus, ChevronDown, ChevronUp, Phone, Mail,
  Edit2, Trash2, CheckCircle, Search, Filter, Bell, Clock,
  MessageSquare, CheckCheck, AlarmClock, AlertCircle, X, FileText
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

// ── Main Component ─────────────────────────────────────────
export default function Leads() {
  const { data, addLead, updateLead, deleteLead, addPayment, addFollowUp, updateFollowUp, addLeadNote } = useCRM();
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Omit<Lead, "id">>(emptyLead);
  const [convertForm, setConvertForm] = useState({ retainerBooked: "", downpayment: "", caseNumber: "", notes: "" });
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "All">("All");
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  // Activity panel — one open at a time, tracks which lead + which tab
  const [activityLeadId, setActivityLeadId] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<"note" | "followup" | "log">("note");
  const [noteText, setNoteText] = useState("");
  const [fuTitle, setFuTitle] = useState("Call back");
  const [fuDate, setFuDate] = useState(new Date().toISOString().split("T")[0]);

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

  const toggleExpand = (id: string) => {
    setExpandedLeads(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openActivity = (leadId: string, tab: "note" | "followup" | "log") => {
    if (activityLeadId === leadId && activityTab === tab) {
      setActivityLeadId(null);
    } else {
      setActivityLeadId(leadId);
      setActivityTab(tab);
      setNoteText("");
      setFuTitle("Call back");
      setFuDate(new Date().toISOString().split("T")[0]);
    }
  };

  const handleSaveNote = (leadId: string) => {
    if (!noteText.trim()) return;
    addLeadNote(leadId, noteText.trim());
    setNoteText("");
    setActivityLeadId(null);
    toast.success("Note saved");
  };

  const handleSaveFollowUp = (leadId: string) => {
    if (!fuTitle.trim()) { toast.error("Enter a task title"); return; }
    if (!fuDate) { toast.error("Select a due date"); return; }
    addFollowUp({ leadId, dueDate: fuDate, status: "Pending", title: fuTitle.trim() });
    setActivityLeadId(null);
    setFuTitle("Call back");
    setFuDate(new Date().toISOString().split("T")[0]);
    toast.success("Follow-up added");
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
                  expanded={expandedLeads.has(lead.id)}
                  onToggle={() => toggleExpand(lead.id)}
                  onEdit={() => openEdit(lead)}
                  onDelete={() => { deleteLead(lead.id); toast.success("Lead deleted"); }}
                  onConvert={() => setConvertLead(lead)}
                  activityOpen={activityLeadId === lead.id}
                  activityTab={activityTab}
                  noteText={activityLeadId === lead.id ? noteText : ""}
                  fuTitle={activityLeadId === lead.id ? fuTitle : "Call back"}
                  fuDate={activityLeadId === lead.id ? fuDate : new Date().toISOString().split("T")[0]}
                  onOpenActivity={(tab) => openActivity(lead.id, tab)}
                  onSwitchTab={setActivityTab}
                  onCloseActivity={() => setActivityLeadId(null)}
                  onNoteTextChange={setNoteText}
                  onFuTitleChange={setFuTitle}
                  onFuDateChange={setFuDate}
                  onSaveNote={() => handleSaveNote(lead.id)}
                  onSaveFollowUp={() => handleSaveFollowUp(lead.id)}
                  onMarkDone={handleMarkDone}
                  onSnooze={handleSnooze}
                  onReschedule={handleReschedule}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

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

// ── LeadCard Component ──────────────────────────────────────
function LeadCard({
  lead, data, expanded, onToggle, onEdit, onDelete, onConvert,
  activityOpen, activityTab, noteText, fuTitle, fuDate,
  onOpenActivity, onSwitchTab, onCloseActivity,
  onNoteTextChange, onFuTitleChange, onFuDateChange,
  onSaveNote, onSaveFollowUp, onMarkDone, onSnooze, onReschedule,
}: {
  lead: Lead;
  data: any;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
  activityOpen: boolean;
  activityTab: "note" | "followup" | "log";
  noteText: string;
  fuTitle: string;
  fuDate: string;
  onOpenActivity: (tab: "note" | "followup" | "log") => void;
  onSwitchTab: (tab: "note" | "followup" | "log") => void;
  onCloseActivity: () => void;
  onNoteTextChange: (v: string) => void;
  onFuTitleChange: (v: string) => void;
  onFuDateChange: (v: string) => void;
  onSaveNote: () => void;
  onSaveFollowUp: () => void;
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
  const isOverdue = dueInfo?.isOverdue ?? false;;

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
            <span className="font-medium text-sm" style={{ color: "oklch(0.93 0.005 250)" }}>{lead.name}</span>
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
        <button onClick={onToggle} style={{ color: "oklch(0.50 0.01 250)" }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                onChange={e => {
                  if (e.target.value) {
                    onReschedule(nextFU, e.target.value);
                    setEditingDueDate(false);
                  }
                }}
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

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          {lead.email && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>
              <Mail className="w-3 h-3" /> {lead.email}
            </div>
          )}
          {lead.source && <div className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Source: {lead.source}</div>}
          {lead.referredBy && <div className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Referred by: {lead.referredBy}</div>}
          {lead.quotedAmount > 0 && <div className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Quote: {formatCurrency(lead.quotedAmount)}</div>}
          {lead.notes && (
            <div className="text-xs p-2 rounded" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.65 0.01 250)" }}>
              {lead.notes}
            </div>
          )}
          {/* Activity log */}
          {(lead.leadLog || []).length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.45 0.01 250)" }}>Activity Log</div>
              {(lead.leadLog || []).slice(-5).reverse().map(n => (
                <div key={n.id} className="text-xs px-2 py-1.5 rounded" style={{ background: "oklch(0.20 0.025 250)", color: "oklch(0.75 0.01 250)", borderLeft: "2px solid oklch(0.55 0.18 250 / 40%)" }}>
                  <span style={{ color: "oklch(0.45 0.01 250)" }}>{new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · </span>
                  {n.text}
                </div>
              ))}
            </div>
          )}
          {/* All follow-ups for this lead */}
          {leadFollowUps.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.45 0.01 250)" }}>Follow-Ups</div>
              {leadFollowUps.map(fu => {
                const info = dueDateLabel(fu.dueDate);
                return (
                  <div key={fu.id} className="text-xs px-2 py-1.5 rounded flex items-center justify-between gap-2"
                    style={{ background: "oklch(0.20 0.025 250)", borderLeft: `2px solid ${fu.status === "Done" ? "oklch(0.55 0.18 145)" : info.color}` }}>
                    <span style={{ color: fu.status === "Done" ? "oklch(0.45 0.01 250)" : "oklch(0.80 0.005 250)", textDecoration: fu.status === "Done" ? "line-through" : "none" }}>
                      {fu.title}
                    </span>
                    <span className="flex-shrink-0 font-medium" style={{ color: fu.status === "Done" ? "oklch(0.55 0.18 145)" : info.color }}>
                      {fu.status === "Done" ? "Done ✓" : info.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Action Row ── */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {lead.stage !== "Retained" && lead.stage !== "Lost" && (
          <button onClick={onConvert} className="flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors"
            style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}>
            <CheckCircle className="w-3 h-3" /> Convert
          </button>
        )}

        {/* Activity button — opens combined Note + Follow-Up panel */}
        <button
          onClick={() => onOpenActivity(activityOpen ? "note" : "note")}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors relative"
          style={{
            background: activityOpen ? "oklch(0.72 0.12 75 / 20%)" : "oklch(0.72 0.12 75 / 8%)",
            color: "oklch(0.72 0.12 75)",
            border: `1px solid oklch(0.72 0.12 75 / ${activityOpen ? "50%" : "25%"})`,
          }}
          title="Add note or follow-up"
        >
          <MessageSquare className="w-3 h-3" />
          Activity
          {pendingCount > 0 && (
            <span className="ml-0.5 font-bold px-1 py-0 rounded-full" style={{ background: "oklch(0.65 0.22 25)", color: "oklch(0.98 0 0)", fontSize: "10px", lineHeight: "14px" }}>
              {pendingCount}
            </span>
          )}
        </button>

        <button onClick={onEdit} className="p-1.5 rounded transition-colors hover:bg-white/5" style={{ color: "oklch(0.55 0.01 250)" }}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded transition-colors hover:bg-red-500/10" style={{ color: "oklch(0.55 0.01 250)" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Combined Activity Panel ── */}
      {activityOpen && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "oklch(0.72 0.12 75 / 20%)" }}>
          {/* Tab switcher */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              <button
                onClick={() => onSwitchTab("note")}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium transition-all"
                style={{
                  background: activityTab === "note" ? "oklch(0.55 0.18 250 / 25%)" : "transparent",
                  color: activityTab === "note" ? "oklch(0.65 0.12 250)" : "oklch(0.50 0.01 250)",
                  border: `1px solid ${activityTab === "note" ? "oklch(0.55 0.18 250 / 40%)" : "transparent"}`,
                }}
              >
                <MessageSquare className="w-3 h-3" /> Note
              </button>
              <button
                onClick={() => onSwitchTab("followup")}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium transition-all"
                style={{
                  background: activityTab === "followup" ? "oklch(0.72 0.12 75 / 20%)" : "transparent",
                  color: activityTab === "followup" ? "oklch(0.72 0.12 75)" : "oklch(0.50 0.01 250)",
                  border: `1px solid ${activityTab === "followup" ? "oklch(0.72 0.12 75 / 40%)" : "transparent"}`,
                }}
              >
                <Bell className="w-3 h-3" /> Follow-Up
              </button>
              <button
                onClick={() => onSwitchTab("log")}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium transition-all"
                style={{
                  background: activityTab === "log" ? "oklch(0.55 0.12 145 / 20%)" : "transparent",
                  color: activityTab === "log" ? "oklch(0.65 0.15 145)" : "oklch(0.50 0.01 250)",
                  border: `1px solid ${activityTab === "log" ? "oklch(0.55 0.12 145 / 40%)" : "transparent"}`,
                }}
              >
                <FileText className="w-3 h-3" /> Log
              </button>
            </div>
            <button onClick={onCloseActivity} style={{ color: "oklch(0.45 0.01 250)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Note tab */}
          {activityTab === "note" && (
            <div className="space-y-2">
              {(lead.leadLog || []).length > 0 && (
                <div className="space-y-1 mb-2">
                  {(lead.leadLog || []).slice(-3).reverse().map(n => (
                    <div key={n.id} className="text-xs px-2 py-1.5 rounded" style={{ background: "oklch(0.20 0.025 250)", color: "oklch(0.75 0.01 250)", borderLeft: "2px solid oklch(0.55 0.18 250 / 40%)" }}>
                      <span style={{ color: "oklch(0.45 0.01 250)" }}>{new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · </span>
                      {n.text}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={e => onNoteTextChange(e.target.value)}
                  placeholder="e.g. M: called, no answer"
                  className="flex-1 px-2.5 py-1.5 rounded text-xs outline-none"
                  style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.55 0.18 250 / 30%)", color: "oklch(0.90 0.005 250)" }}
                  onKeyDown={e => { if (e.key === "Enter") onSaveNote(); if (e.key === "Escape") onCloseActivity(); }}
                  autoFocus
                />
                <button onClick={onSaveNote} className="text-xs px-3 py-1.5 rounded font-medium transition-all hover:opacity-90"
                  style={{ background: "oklch(0.55 0.18 250)", color: "oklch(0.98 0 0)" }}>
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Log tab — combined chronological activity feed */}
          {activityTab === "log" && (() => {
            type FeedItem = { id: string; timestamp: string; text: string; kind: "note" | "comment"; fuTitle?: string };
            const feed: FeedItem[] = [
              ...(lead.leadLog || []).map(n => ({ id: n.id, timestamp: n.timestamp, text: n.text, kind: "note" as const })),
              ...leadFollowUps.flatMap(fu =>
                (fu.comments || []).map(c => ({ id: c.id, timestamp: c.timestamp, text: c.text, kind: "comment" as const, fuTitle: fu.title }))
              ),
            ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            return (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {feed.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "oklch(0.40 0.01 250)" }}>No activity logged yet. Add a note or follow-up comment.</p>
                ) : feed.map(item => (
                  <div key={item.id} className="text-xs px-2.5 py-2 rounded" style={{ background: "oklch(0.20 0.025 250)", borderLeft: `2px solid ${item.kind === "note" ? "oklch(0.55 0.18 250 / 50%)" : "oklch(0.72 0.12 75 / 50%)"}` }}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold" style={{ color: item.kind === "note" ? "oklch(0.65 0.12 250)" : "oklch(0.72 0.12 75)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {item.kind === "note" ? "Note" : `FU: ${item.fuTitle}`}
                      </span>
                      <span style={{ color: "oklch(0.35 0.01 250)" }}>·</span>
                      <span style={{ color: "oklch(0.40 0.01 250)" }}>{new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(item.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <div style={{ color: "oklch(0.82 0.005 250)" }}>{item.text}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Follow-Up tab */}
          {activityTab === "followup" && (
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={fuTitle}
                  onChange={e => onFuTitleChange(e.target.value)}
                  placeholder="Task (e.g. Call back)"
                  className="flex-1 min-w-32 px-2.5 py-1.5 rounded text-xs outline-none"
                  style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: "oklch(0.90 0.005 250)" }}
                  onKeyDown={e => { if (e.key === "Enter") onSaveFollowUp(); if (e.key === "Escape") onCloseActivity(); }}
                  autoFocus
                />
                <input
                  type="date"
                  value={fuDate}
                  onChange={e => onFuDateChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded text-xs outline-none"
                  style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: "oklch(0.90 0.005 250)" }}
                />
              </div>
              <button onClick={onSaveFollowUp} className="text-xs px-3 py-1.5 rounded font-medium transition-all hover:opacity-90"
                style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>
                Add Follow-Up
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
