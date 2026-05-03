/* ============================================================
   Law Firm CRM — Leads Page
   Features: Pipeline kanban, Add Lead form, Convert button,
             retainer tracking per lead, edit/delete
   ============================================================ */

import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { type Lead, type LeadStage, type CaseType, formatCurrency, formatDate, getLeadTotalReceived, getLeadFollowUps } from "@/lib/store";
import { toast } from "sonner";
import {
  Users, Plus, X, ChevronDown, ChevronUp, Phone, Mail,
  Edit2, Trash2, CheckCircle, Search, Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const STAGES: LeadStage[] = ["New Lead", "Consultation", "Retained", "Lost"];
const CASE_TYPES: CaseType[] = ["DA", "SIJS", "AOS", "AO", "K1/K2", "U-Visa", "Green Card", "BIA", "Other"];

const stageBadge: Record<LeadStage, string> = {
  "New Lead": "badge-new",
  "Consultation": "badge-consultation",
  "Retained": "badge-retained",
  "Lost": "badge-lost",
};

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

export default function Leads() {
  const { data, addLead, updateLead, deleteLead, addPayment } = useCRM();
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Omit<Lead, "id">>(emptyLead);
  const [convertForm, setConvertForm] = useState({ retainerBooked: "", downpayment: "", caseNumber: "", notes: "" });
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "All">("All");
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return data.leads.filter(l => {
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
        l.caseType.toLowerCase().includes(search.toLowerCase());
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
            Leads Pipeline
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
            {data.leads.length} total leads · {data.leads.filter(l => l.stage === "Retained").length} retained
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
            {/* Column header */}
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "oklch(1 0 0 / 8%)", borderLeft: `3px solid ${stageColor[stage]}` }}>
              <span className="text-sm font-semibold" style={{ color: "oklch(0.80 0.005 250)" }}>{stage}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${stageColor[stage]}20`, color: stageColor[stage] }}>
                {byStage[stage].length}
              </span>
            </div>
            {/* Cards */}
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
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Source / Referred By</Label>
              <Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Referral, Direct"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Quote Amount ($)</Label>
              <Input type="number" value={form.quotedAmount || ""} onChange={e => setForm(f => ({ ...f, quotedAmount: parseFloat(e.target.value) || 0 }))} placeholder="0"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Downpayment ($)</Label>
              <Input type="number" value={form.downpayment || ""} onChange={e => setForm(f => ({ ...f, downpayment: parseFloat(e.target.value) || 0 }))} placeholder="0"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            {(form.stage === "Retained") && (
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Retainer Booked ($)</Label>
                <Input type="number" value={form.retainerBooked || ""} onChange={e => setForm(f => ({ ...f, retainerBooked: parseFloat(e.target.value) || 0 }))} placeholder="0"
                  style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
              </div>
            )}
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Case details, context..."
                rows={3} style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleSave} style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>
              {editLead ? "Save Changes" : "Add Lead"}
            </Button>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditLead(null); setForm(emptyLead); }}
              style={{ borderColor: "oklch(1 0 0 / 15%)", color: "oklch(0.65 0.01 250)" }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Convert Modal ───────────────────────────────────── */}
      <Dialog open={!!convertLead} onOpenChange={open => { if (!open) setConvertLead(null); }}>
        <DialogContent style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.55 0.18 145 / 40%)", color: "oklch(0.93 0.005 250)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.55 0.18 145)" }}>
              Convert to Retained Client
            </DialogTitle>
          </DialogHeader>
          {convertLead && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg" style={{ background: "oklch(0.22 0.025 250)" }}>
                <div className="font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>{convertLead.name}</div>
                <div className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>{convertLead.caseType} · {convertLead.date}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Total Retainer Booked ($) *</Label>
                  <Input type="number" value={convertForm.retainerBooked} onChange={e => setConvertForm(f => ({ ...f, retainerBooked: e.target.value }))} placeholder="e.g. 9000"
                    style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Amount Received at Signing ($)</Label>
                  <Input type="number" value={convertForm.downpayment} onChange={e => setConvertForm(f => ({ ...f, downpayment: e.target.value }))} placeholder="e.g. 2000"
                    style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Case Number</Label>
                <Input value={convertForm.caseNumber} onChange={e => setConvertForm(f => ({ ...f, caseNumber: e.target.value }))} placeholder="e.g. 500"
                  style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Notes</Label>
                <Input value={convertForm.notes} onChange={e => setConvertForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes"
                  style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleConvert} style={{ background: "oklch(0.55 0.18 145)", color: "oklch(0.98 0 0)" }}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Confirm Convert
                </Button>
                <Button variant="outline" onClick={() => setConvertLead(null)} style={{ borderColor: "oklch(1 0 0 / 15%)", color: "oklch(0.65 0.01 250)" }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────

function LeadCard({ lead, data, expanded, onToggle, onEdit, onDelete, onConvert }: {
  lead: Lead;
  data: any;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  const totalReceived = getLeadTotalReceived(data, lead.id);
  const outstanding = lead.retainerBooked > 0 ? lead.retainerBooked - totalReceived : 0;
  const pct = lead.retainerBooked > 0 ? Math.min(100, (totalReceived / lead.retainerBooked) * 100) : 0;
  const paidFull = lead.retainerBooked > 0 && totalReceived >= lead.retainerBooked;

  return (
    <div className="rounded-lg border p-3 transition-all" style={{ background: "oklch(0.19 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
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
          {lead.phone && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>
              <Phone className="w-3 h-3" /> {lead.phone}
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>
              <Mail className="w-3 h-3" /> {lead.email}
            </div>
          )}
          {lead.source && (
            <div className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Source: {lead.source}</div>
          )}
          {lead.quotedAmount > 0 && (
            <div className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Quote: {formatCurrency(lead.quotedAmount)}</div>
          )}
          {lead.notes && (
            <div className="text-xs p-2 rounded" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.65 0.01 250)" }}>
              {lead.notes}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        {lead.stage !== "Retained" && lead.stage !== "Lost" && (
          <button onClick={onConvert} className="flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors"
            style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}>
            <CheckCircle className="w-3 h-3" /> Convert
          </button>
        )}
        <button onClick={onEdit} className="p-1.5 rounded transition-colors hover:bg-white/5" style={{ color: "oklch(0.55 0.01 250)" }}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded transition-colors hover:bg-red-500/10" style={{ color: "oklch(0.55 0.01 250)" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
