/* ============================================================
   Law Firm CRM — Payments Page
   Features: Log payment (New/Existing toggle), live client search,
             payment list with filters, delete confirmation dialog
   ============================================================ */

import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { type Payment, type CaseType, type PaymentType, formatCurrency, formatDate } from "@/lib/store";
import { toast } from "sonner";
import { DollarSign, Plus, Search, Filter, Edit2, Trash2, X, Users, Building } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const CASE_TYPES: CaseType[] = ["DA", "SIJS", "AOS", "AO", "K1/K2", "U-Visa", "Green Card", "BIA", "Other"];

const emptyPayment: Omit<Payment, "id"> = {
  date: new Date().toISOString().split("T")[0],
  clientName: "",
  leadId: undefined,
  caseType: "DA",
  caseNumber: "",
  paymentType: "New Client",
  amount: 0,
  receivedFor: "",
  notes: "",
};

export default function Payments() {
  const { leads, payments, addPayment, updatePayment, deletePayment } = useCRM();
  const [showAdd, setShowAdd] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null);
  const [form, setForm] = useState<Omit<Payment, "id">>(emptyPayment);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<PaymentType | "All">("All");

  // Retained clients for search
  const retainedLeads = useMemo(() => leads.filter(l => l.stage === "Retained"), [leads]);
  const clientMatches = useMemo(() => {
    if (clientSearch.length < 2) return [];
    return retainedLeads.filter(l => l.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 6);
  }, [retainedLeads, clientSearch]);

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const matchSearch = !search || p.clientName.toLowerCase().includes(search.toLowerCase()) ||
        p.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.receivedFor.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "All" || p.paymentType === filterType;
      return matchSearch && matchType;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, search, filterType]);

  const totalNew = filtered.filter(p => p.paymentType === "New Client").reduce((s, p) => s + p.amount, 0);
  const totalExisting = filtered.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + p.amount, 0);

  const handleSave = () => {
    if (!form.clientName.trim()) { toast.error("Client name is required"); return; }
    if (form.amount <= 0) { toast.error("Amount must be greater than 0"); return; }
    if (!form.receivedFor.trim()) { toast.error("Please specify what the payment is for"); return; }

    if (editPayment) {
      updatePayment(editPayment.id, form);
      toast.success("Payment updated");
      setEditPayment(null);
    } else {
      addPayment(form);
      toast.success("Payment logged");
      setShowAdd(false);
    }
    setForm(emptyPayment);
    setClientSearch("");
  };

  const openEdit = (p: Payment) => {
    setEditPayment(p);
    const { id, ...rest } = p;
    setForm(rest);
    setClientSearch(p.clientName);
    setShowAdd(true);
  };

  const linkClient = (lead: typeof retainedLeads[0]) => {
    setForm(f => ({
      ...f,
      clientName: lead.name,
      leadId: lead.id,
      caseType: lead.caseType,
      caseNumber: lead.caseNumber,
    }));
    setClientSearch(lead.name);
    setShowClientDropdown(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
            Payments
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
            {payments.length} total payments
          </p>
        </div>
        <Button onClick={() => { setEditPayment(null); setForm(emptyPayment); setClientSearch(""); setShowAdd(true); }}
          style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>
          <Plus className="w-4 h-4 mr-2" /> Log Payment
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "New Client Revenue", value: formatCurrency(totalNew), color: "oklch(0.72 0.12 75)" },
          { label: "Existing Client Revenue", value: formatCurrency(totalExisting), color: "oklch(0.55 0.15 200)" },
          { label: "Total (Filtered)", value: formatCurrency(totalNew + totalExisting), color: "oklch(0.55 0.18 145)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 250)" }}>{label}</div>
            <div className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.55 0.01 250)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..."
            className="pl-9" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
        </div>
        <Select value={filterType} onValueChange={v => setFilterType(v as PaymentType | "All")}>
          <SelectTrigger className="w-48" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
            <Filter className="w-3.5 h-3.5 mr-2" style={{ color: "oklch(0.55 0.01 250)" }} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
            <SelectItem value="All">All Types</SelectItem>
            <SelectItem value="New Client">New Client</SelectItem>
            <SelectItem value="Existing Client">Existing Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments table */}
      <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
                {["Date", "Client", "Case", "Type", "Amount", "Outstanding", "Received For", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.01 250)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-sm" style={{ color: "oklch(0.40 0.01 250)" }}>No payments found</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="border-b transition-colors hover:bg-white/2" style={{ borderColor: "oklch(1 0 0 / 5%)" }}>
                  <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>{formatDate(p.date)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "oklch(0.93 0.005 250)" }}>
                    <div>{p.clientName}</div>
                    {p.leadId && <div className="text-xs" style={{ color: "oklch(0.55 0.18 145)" }}>● Linked</div>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>
                    <span className="px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{p.caseType}</span>
                    {p.caseNumber && <span className="ml-1">#{p.caseNumber}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.paymentType === "New Client" ? "badge-retained" : "badge-consultation"}`}>
                      {p.paymentType === "New Client" ? "New" : "Existing"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: "oklch(0.72 0.12 75)", fontFamily: "'Playfair Display', serif" }}>
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      if (!p.leadId) return <span className="text-xs" style={{ color: "oklch(0.40 0.01 250)" }}>—</span>;
                      const lead = leads.find(l => l.id === p.leadId);
                      if (!lead || !lead.retainerBooked) return <span className="text-xs" style={{ color: "oklch(0.40 0.01 250)" }}>—</span>;
                      const collected = payments.filter(x => x.leadId === p.leadId).reduce((s, x) => s + x.amount, 0);
                      const outstanding = lead.retainerBooked - collected;
                      const color = outstanding <= 0 ? "oklch(0.65 0.18 145)" : outstanding < lead.retainerBooked * 0.5 ? "oklch(0.72 0.12 75)" : "oklch(0.70 0.22 25)";
                      return (
                        <span className="text-xs font-semibold" style={{ color }}>
                          {outstanding <= 0 ? "Paid" : formatCurrency(outstanding)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-48 truncate" style={{ color: "oklch(0.65 0.01 250)" }}>{p.receivedFor}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        title="Edit payment"
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        style={{ color: "oklch(0.72 0.12 75)" }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        title="Delete payment"
                        className="p-1.5 rounded hover:bg-red-500/15 transition-colors"
                        style={{ color: "oklch(0.65 0.18 25)" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Delete Confirmation ──────────────────────────────── */}
      <AlertDialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
              Delete Payment?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "oklch(0.55 0.01 250)" }}>
              {confirmDelete && (
                <span>
                  Permanently delete the{" "}
                  <strong style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(confirmDelete.amount)}</strong>{" "}
                  payment from{" "}
                  <strong style={{ color: "oklch(0.93 0.005 250)" }}>{confirmDelete.clientName}</strong>{" "}
                  on {formatDate(confirmDelete.date)}? This cannot be undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 15%)", color: "oklch(0.65 0.01 250)" }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  deletePayment(confirmDelete.id);
                  toast.success("Payment deleted");
                  setConfirmDelete(null);
                }
              }}
              style={{ background: "oklch(0.55 0.22 25)", color: "oklch(0.98 0 0)" }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add/Edit Payment Modal ──────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={open => { if (!open) { setShowAdd(false); setEditPayment(null); setForm(emptyPayment); setClientSearch(""); } }}>
        <DialogContent className="max-w-lg" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
              {editPayment ? "Edit Payment" : "Log Payment"}
            </DialogTitle>
          </DialogHeader>

          {/* New/Existing toggle */}
          <div className="flex rounded-lg overflow-hidden border mt-2" style={{ borderColor: "oklch(1 0 0 / 12%)" }}>
            {(["New Client", "Existing Client"] as PaymentType[]).map(type => (
              <button
                key={type}
                onClick={() => setForm(f => ({ ...f, paymentType: type }))}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all"
                style={{
                  background: form.paymentType === type
                    ? type === "New Client" ? "oklch(0.55 0.18 145 / 20%)" : "oklch(0.55 0.15 200 / 20%)"
                    : "oklch(0.22 0.025 250)",
                  color: form.paymentType === type
                    ? type === "New Client" ? "oklch(0.55 0.18 145)" : "oklch(0.55 0.15 200)"
                    : "oklch(0.55 0.01 250)",
                  borderRight: type === "New Client" ? "1px solid oklch(1 0 0 / 12%)" : "none",
                }}
              >
                {type === "New Client" ? <Users className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-3 mt-2">
            {/* Client search */}
            <div className="relative">
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>
                Client Name * {form.leadId && <span style={{ color: "oklch(0.55 0.18 145)" }}>● Linked to record</span>}
              </Label>
              <div className="relative">
                <Input
                  value={clientSearch}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setForm(f => ({ ...f, clientName: e.target.value, leadId: undefined }));
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder="Type client name (2+ chars to search retained clients)"
                  style={{ background: "oklch(0.22 0.025 250)", borderColor: form.leadId ? "oklch(0.55 0.18 145 / 50%)" : "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}
                />
                {form.leadId && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setForm(f => ({ ...f, leadId: undefined, clientName: "" })); setClientSearch(""); }} style={{ color: "oklch(0.55 0.01 250)" }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showClientDropdown && clientMatches.length > 0 && (
                <div className="absolute z-50 w-full mt-1 rounded-lg border shadow-xl overflow-hidden" style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 15%)" }}>
                  {clientMatches.map(lead => (
                    <button key={lead.id} onClick={() => linkClient(lead)} className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors">
                      <div className="text-sm font-medium" style={{ color: "oklch(0.93 0.005 250)" }}>{lead.name}</div>
                      <div className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>{lead.caseType} · #{lead.caseNumber} · Retainer: {formatCurrency(lead.retainerBooked)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Amount ($) *</Label>
                <Input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0"
                  style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Received For *</Label>
              <Input value={form.receivedFor} onChange={e => setForm(f => ({ ...f, receivedFor: e.target.value }))} placeholder="e.g. For I-589 updates, Retainer downpayment"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>

            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional"
                rows={2} style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button onClick={handleSave} style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>
              {editPayment ? "Save Changes" : "Log Payment"}
            </Button>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditPayment(null); setForm(emptyPayment); setClientSearch(""); }}
              style={{ borderColor: "oklch(1 0 0 / 15%)", color: "oklch(0.65 0.01 250)" }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
