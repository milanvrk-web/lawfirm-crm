/* ============================================================
   Law Firm CRM — Clients Ledger Page
   Features: Portfolio summary, per-client card with payment history,
             retainer progress, outstanding balances
   ============================================================ */

import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { formatCurrency, formatDate, getClientPayments } from "@/lib/store";
import { BookOpen, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Clients() {
  const { data } = useCRM();
  const [search, setSearch] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const retainedLeads = useMemo(() => data.leads.filter(l => l.stage === "Retained"), [data.leads]);

  const clientsWithData = useMemo(() => {
    return retainedLeads.map(lead => {
      const payments = getClientPayments(data, lead.id);
      const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = lead.retainerBooked > 0 ? Math.max(0, lead.retainerBooked - totalReceived) : 0;
      const paidFull = lead.retainerBooked > 0 && totalReceived >= lead.retainerBooked;
      return { lead, payments, totalReceived, outstanding, paidFull };
    }).filter(c => !search || c.lead.name.toLowerCase().includes(search.toLowerCase()) || c.lead.caseType.toLowerCase().includes(search.toLowerCase()));
  }, [retainedLeads, data, search]);

  // Portfolio totals
  const totalBooked = clientsWithData.reduce((s, c) => s + c.lead.retainerBooked, 0);
  const totalReceived = clientsWithData.reduce((s, c) => s + c.totalReceived, 0);
  const totalOutstanding = clientsWithData.reduce((s, c) => s + c.outstanding, 0);

  const toggleExpand = (id: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
          Client Ledger
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
          {retainedLeads.length} active clients · linked payment history
        </p>
      </div>

      {/* Portfolio summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Booked", value: formatCurrency(totalBooked), color: "oklch(0.72 0.12 75)" },
          { label: "Total Received", value: formatCurrency(totalReceived), color: "oklch(0.55 0.18 145)" },
          { label: "Total Outstanding", value: formatCurrency(totalOutstanding), color: "oklch(0.72 0.15 80)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 250)" }}>{label}</div>
            <div className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.55 0.01 250)" }} />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          className="pl-9" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
      </div>

      {/* Client cards */}
      <div className="space-y-3">
        {clientsWithData.length === 0 && (
          <div className="text-center py-16 rounded-lg border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)", color: "oklch(0.40 0.01 250)" }}>
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <div>No retained clients found</div>
          </div>
        )}
        {clientsWithData.map(({ lead, payments, totalReceived: rcvd, outstanding, paidFull }) => {
          const expanded = expandedClients.has(lead.id);
          const pct = lead.retainerBooked > 0 ? Math.min(100, (rcvd / lead.retainerBooked) * 100) : 0;

          return (
            <div key={lead.id} className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: paidFull ? "oklch(0.55 0.18 145 / 30%)" : "oklch(1 0 0 / 8%)" }}>
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>{lead.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{lead.caseType}</span>
                      {lead.caseNumber && <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>#{lead.caseNumber}</span>}
                      {paidFull && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "oklch(0.55 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}>PAID IN FULL ✓</span>}
                    </div>
                    {lead.convertedDate && (
                      <div className="text-xs mt-1" style={{ color: "oklch(0.50 0.01 250)" }}>
                        Retained: {formatDate(lead.convertedDate)} · {payments.length} payment{payments.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggleExpand(lead.id)} style={{ color: "oklch(0.55 0.01 250)" }}>
                    {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {/* Retainer progress */}
                {lead.retainerBooked > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1.5" style={{ color: "oklch(0.55 0.01 250)" }}>
                      <span>Booked: <strong style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(lead.retainerBooked)}</strong></span>
                      <span>Received: <strong style={{ color: "oklch(0.55 0.18 145)" }}>{formatCurrency(rcvd)}</strong></span>
                      <span>Outstanding: <strong style={{ color: outstanding > 0 ? "oklch(0.72 0.15 80)" : "oklch(0.55 0.18 145)" }}>{formatCurrency(outstanding)}</strong></span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: paidFull ? "oklch(0.55 0.18 145)" : "oklch(0.72 0.12 75)" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded payment history */}
              {expanded && (
                <div className="border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                  {payments.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm" style={{ color: "oklch(0.40 0.01 250)" }}>
                      No linked payments yet. Log a payment and link it to this client.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
                            {["Date", "Amount", "Received For", "Type"].map(h => (
                              <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.50 0.01 250)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {payments.sort((a, b) => a.date.localeCompare(b.date)).map((p, i) => {
                            const running = payments.slice(0, i + 1).reduce((s, pp) => s + pp.amount, 0);
                            return (
                              <tr key={p.id} className="border-b" style={{ borderColor: "oklch(1 0 0 / 5%)" }}>
                                <td className="px-4 py-2.5 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>{formatDate(p.date)}</td>
                                <td className="px-4 py-2.5 font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(p.amount)}</td>
                                <td className="px-4 py-2.5 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>{p.receivedFor}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${p.paymentType === "New Client" ? "badge-retained" : "badge-consultation"}`}>
                                    {p.paymentType === "New Client" ? "New" : "Existing"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{ background: "oklch(0.22 0.025 250)" }}>
                            <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "oklch(0.65 0.01 250)" }}>Total</td>
                            <td className="px-4 py-2.5 font-bold" style={{ color: "oklch(0.55 0.18 145)" }}>{formatCurrency(rcvd)}</td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                              {outstanding > 0 ? `${formatCurrency(outstanding)} outstanding` : "Paid in full"}
                            </td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
