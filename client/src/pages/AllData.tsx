/* ============================================================
   Law Firm CRM — All Data Page
   Features: Full leads table + full payments table, both
             searchable and filterable, with edit/delete
   ============================================================ */

import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { type LeadStage, type PaymentType, formatCurrency, formatDate } from "@/lib/store";
import { Database, Search, Filter, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";

const STAGES: LeadStage[] = ["New Lead", "Consultation", "Retained", "Lost"];

export default function AllData() {
  const { leads, payments, deleteLead, deletePayment } = useCRM();
  const [activeTab, setActiveTab] = useState<"leads" | "payments">("leads");

  // Leads filters
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStageFilter, setLeadStageFilter] = useState<LeadStage | "All">("All");
  const [leadSort, setLeadSort] = useState<"date-desc" | "date-asc" | "name">("date-desc");

  // Payments filters
  const [paySearch, setPaySearch] = useState("");
  const [payTypeFilter, setPayTypeFilter] = useState<PaymentType | "All">("All");

  const filteredLeads = useMemo(() => {
    let allLeads = [...leads];
    if (leadSearch) allLeads = allLeads.filter((l: typeof leads[0]) =>
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.caseNumber.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.caseType.toLowerCase().includes(leadSearch.toLowerCase())
    );
    if (leadStageFilter !== "All") allLeads = allLeads.filter((l: typeof leads[0]) => l.stage === leadStageFilter);
    if (leadSort === "date-desc") allLeads.sort((a: typeof leads[0], b: typeof leads[0]) => b.date.localeCompare(a.date));
    else if (leadSort === "date-asc") allLeads.sort((a: typeof leads[0], b: typeof leads[0]) => a.date.localeCompare(b.date));
    else allLeads.sort((a: typeof leads[0], b: typeof leads[0]) => a.name.localeCompare(b.name));
    return allLeads;
  }, [leads, leadSearch, leadStageFilter, leadSort]);

  const filteredPayments = useMemo(() => {
    let pays = [...payments];
    if (paySearch) pays = pays.filter(p =>
      p.clientName.toLowerCase().includes(paySearch.toLowerCase()) ||
      p.caseNumber.toLowerCase().includes(paySearch.toLowerCase()) ||
      p.receivedFor.toLowerCase().includes(paySearch.toLowerCase())
    );
    if (payTypeFilter !== "All") pays = pays.filter(p => p.paymentType === payTypeFilter);
    pays.sort((a, b) => b.date.localeCompare(a.date));
    return pays;
  }, [payments, paySearch, payTypeFilter]);

  const stageColor: Record<LeadStage, string> = {
    "New Lead": "badge-new",
    "Consultation": "badge-consultation",
    "Retained": "badge-retained",
    "Lost": "badge-lost",
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
          All Data
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
          {leads.length} leads · {payments.length} payments
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "oklch(0.18 0.025 250)" }}>
        {(["leads", "payments"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-md text-sm font-medium transition-all capitalize"
            style={{
              background: activeTab === tab ? "oklch(0.72 0.12 75)" : "transparent",
              color: activeTab === tab ? "oklch(0.13 0.025 250)" : "oklch(0.55 0.01 250)",
            }}
          >
            {tab} ({tab === "leads" ? leads.length : payments.length})
          </button>
        ))}
      </div>

      {/* ── Leads Tab ─────────────────────────────────────── */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.55 0.01 250)" }} />
              <Input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Search leads..."
                className="pl-9" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <Select value={leadStageFilter} onValueChange={v => setLeadStageFilter(v as LeadStage | "All")}>
              <SelectTrigger className="w-40" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                <SelectItem value="All">All Stages</SelectItem>
                {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={leadSort} onValueChange={v => setLeadSort(v as typeof leadSort)}>
              <SelectTrigger className="w-40" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
                    {["Date", "Name", "Case", "Stage", "Quote", "Retainer", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.01 250)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-sm" style={{ color: "oklch(0.40 0.01 250)" }}>No leads found</td></tr>
                  )}
                  {filteredLeads.map(l => (
                    <tr key={l.id} className="border-b transition-colors hover:bg-white/2" style={{ borderColor: "oklch(1 0 0 / 5%)" }}>
                      <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>{formatDate(l.date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium" style={{ color: "oklch(0.93 0.005 250)" }}>{l.name}</div>
                        {l.source && <div className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>via {l.source}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>
                        <span className="px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{l.caseType}</span>
                        {l.caseNumber && <span className="ml-1">#{l.caseNumber}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${stageColor[l.stage]}`}>{l.stage}</span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>
                        {l.quotedAmount > 0 ? formatCurrency(l.quotedAmount) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: l.retainerBooked > 0 ? "oklch(0.72 0.12 75)" : "oklch(0.40 0.01 250)" }}>
                        {l.retainerBooked > 0 ? formatCurrency(l.retainerBooked) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href="/leads">
                            <button className="p-1.5 rounded hover:bg-white/5" style={{ color: "oklch(0.55 0.01 250)" }} title="Edit in Leads">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          <button onClick={() => { deleteLead(l.id); toast.success("Lead deleted"); }} className="p-1.5 rounded hover:bg-red-500/10" style={{ color: "oklch(0.55 0.01 250)" }}>
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
        </div>
      )}

      {/* ── Payments Tab ──────────────────────────────────── */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.55 0.01 250)" }} />
              <Input value={paySearch} onChange={e => setPaySearch(e.target.value)} placeholder="Search payments..."
                className="pl-9" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <Select value={payTypeFilter} onValueChange={v => setPayTypeFilter(v as PaymentType | "All")}>
              <SelectTrigger className="w-48" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="New Client">New Client</SelectItem>
                <SelectItem value="Existing Client">Existing Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
                    {["Date", "Client", "Case", "Type", "Amount", "Received For", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.01 250)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-sm" style={{ color: "oklch(0.40 0.01 250)" }}>No payments found</td></tr>
                  )}
                  {filteredPayments.map(p => (
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.paymentType === "New Client" ? "badge-retained" : "badge-consultation"}`}>
                          {p.paymentType === "New Client" ? "New" : "Existing"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: "oklch(0.72 0.12 75)", fontFamily: "'Playfair Display', serif" }}>
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-48 truncate" style={{ color: "oklch(0.65 0.01 250)" }}>{p.receivedFor}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => { deletePayment(p.id); toast.success("Payment deleted"); }} className="p-1.5 rounded hover:bg-red-500/10" style={{ color: "oklch(0.55 0.01 250)" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
