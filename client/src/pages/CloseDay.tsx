/* ============================================================
   Law Firm CRM — Close Day Page
   Feature: Daily register close — see all payments for a day,
            confirm totals, lock the day with a green badge
   ============================================================ */

import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { formatCurrency, formatDate } from "@/lib/store";
import { CalendarCheck, Lock, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function CloseDay() {
  const { leads, payments, closeDay, isDayClosed, getDayClose } = useCRM();
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const paymentsForDay = useMemo(() =>
    payments.filter(p => p.date === selectedDate).sort((a, b) => a.clientName.localeCompare(b.clientName)),
    [payments, selectedDate]
  );

  const leadsForDay = useMemo(() =>
    leads.filter(l => l.date === selectedDate),
    [leads, selectedDate]
  );

  const newPayments = paymentsForDay.filter(p => p.paymentType === "New Client");
  const existingPayments = paymentsForDay.filter(p => p.paymentType === "Existing Client");
  const totalNew = newPayments.reduce((s, p) => s + p.amount, 0);
  const totalExisting = existingPayments.reduce((s, p) => s + p.amount, 0);
  const grandTotal = totalNew + totalExisting;

  const closed = isDayClosed(selectedDate);
  const closeRecord = getDayClose(selectedDate);

  const prevDay = () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const nextDay = () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleClose = () => {
    closeDay(selectedDate);
    toast.success(`${formatDate(selectedDate)} closed successfully`);
  };

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
          Close Day
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
          Review and lock daily revenue — like closing a register
        </p>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-3">
        <button onClick={prevDay} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "oklch(0.55 0.01 250)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <div className="text-lg font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>{displayDate}</div>
          <input
            type="date"
            value={selectedDate}
            onChange={e => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            className="mt-1 text-xs px-2 py-1 rounded border"
            style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.65 0.01 250)", colorScheme: "dark" }}
          />
        </div>
        <button onClick={nextDay} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "oklch(0.55 0.01 250)" }}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Closed badge */}
      {closed && closeRecord && (
        <div className="flex items-center gap-3 p-4 rounded-lg border" style={{ background: "oklch(0.55 0.18 145 / 10%)", borderColor: "oklch(0.55 0.18 145 / 40%)" }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.55 0.18 145)" }} />
          <div>
            <div className="font-semibold text-sm" style={{ color: "oklch(0.55 0.18 145)" }}>Day Closed ✓</div>
            <div className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
              Closed at {new Date(closeRecord.closedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ·
              Total: {formatCurrency(closeRecord.totalRevenue)} ({formatCurrency(closeRecord.totalNew)} new + {formatCurrency(closeRecord.totalExisting)} existing)
            </div>
          </div>
        </div>
      )}

      {/* Grand total */}
      <div className="rounded-lg p-6 border text-center" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 30%)" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.01 250)" }}>
          Total Revenue — {displayDate}
        </div>
        <div className="text-5xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.72 0.12 75)" }}>
          {formatCurrency(grandTotal)}
        </div>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "oklch(0.55 0.18 145)" }}>{formatCurrency(totalNew)}</div>
            <div className="text-xs mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>New Client Revenue</div>
          </div>
          <div className="w-px" style={{ background: "oklch(1 0 0 / 10%)" }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "oklch(0.55 0.15 200)" }}>{formatCurrency(totalExisting)}</div>
            <div className="text-xs mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>Existing Client Revenue</div>
          </div>
        </div>
      </div>

      {/* New Client payments */}
      {newPayments.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.55 0.18 145 / 20%)" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "oklch(0.55 0.18 145 / 20%)", background: "oklch(0.55 0.18 145 / 8%)" }}>
            <span className="text-sm font-semibold" style={{ color: "oklch(0.55 0.18 145)" }}>New Client Payments</span>
            <span className="font-bold" style={{ color: "oklch(0.55 0.18 145)" }}>{formatCurrency(totalNew)}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {newPayments.map(p => (
                <tr key={p.id} className="border-b" style={{ borderColor: "oklch(1 0 0 / 5%)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "oklch(0.93 0.005 250)" }}>{p.clientName}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>
                    <span className="px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{p.caseType}</span>
                    {p.caseNumber && <span className="ml-1">#{p.caseNumber}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>{p.receivedFor}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(p.amount)}</td>
                </tr>
              ))}
              <tr style={{ background: "oklch(0.55 0.18 145 / 8%)" }}>
                <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold" style={{ color: "oklch(0.55 0.18 145)" }}>Subtotal — New Clients</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: "oklch(0.55 0.18 145)" }}>{formatCurrency(totalNew)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Existing Client payments */}
      {existingPayments.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.55 0.15 200 / 20%)" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "oklch(0.55 0.15 200 / 20%)", background: "oklch(0.55 0.15 200 / 8%)" }}>
            <span className="text-sm font-semibold" style={{ color: "oklch(0.55 0.15 200)" }}>Existing Client Payments</span>
            <span className="font-bold" style={{ color: "oklch(0.55 0.15 200)" }}>{formatCurrency(totalExisting)}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {existingPayments.map(p => (
                <tr key={p.id} className="border-b" style={{ borderColor: "oklch(1 0 0 / 5%)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "oklch(0.93 0.005 250)" }}>{p.clientName}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>
                    <span className="px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{p.caseType}</span>
                    {p.caseNumber && <span className="ml-1">#{p.caseNumber}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.65 0.01 250)" }}>{p.receivedFor}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(p.amount)}</td>
                </tr>
              ))}
              <tr style={{ background: "oklch(0.55 0.15 200 / 8%)" }}>
                <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold" style={{ color: "oklch(0.55 0.15 200)" }}>Subtotal — Existing Clients</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: "oklch(0.55 0.15 200)" }}>{formatCurrency(totalExisting)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Leads for the day */}
      {leadsForDay.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
            <span className="text-sm font-semibold" style={{ color: "oklch(0.65 0.01 250)" }}>Leads — {leadsForDay.length} received</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {leadsForDay.map(l => (
                <tr key={l.id} className="border-b" style={{ borderColor: "oklch(1 0 0 / 5%)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "oklch(0.93 0.005 250)" }}>{l.name}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{l.caseType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.stage === "Retained" ? "badge-retained" : l.stage === "Lost" ? "badge-lost" : l.stage === "Consultation" ? "badge-consultation" : "badge-new"}`}>
                      {l.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                    {l.quotedAmount > 0 ? `Quote: ${formatCurrency(l.quotedAmount)}` : "No quote"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No activity */}
      {paymentsForDay.length === 0 && leadsForDay.length === 0 && (
        <div className="text-center py-16 rounded-lg border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)", color: "oklch(0.40 0.01 250)" }}>
          <CalendarCheck className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <div>No activity recorded for this date</div>
        </div>
      )}

      {/* Grand total row + Close button */}
      {(paymentsForDay.length > 0 || leadsForDay.length > 0) && (
        <div className="flex items-center justify-between p-4 rounded-lg border" style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: "oklch(0.80 0.005 250)" }}>Grand Total</div>
            <div className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
              {newPayments.length} new · {existingPayments.length} existing · {leadsForDay.length} leads
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.72 0.12 75)" }}>
              {formatCurrency(grandTotal)}
            </div>
            {!closed ? (
              <Button onClick={handleClose} style={{ background: "oklch(0.55 0.18 145)", color: "oklch(0.98 0 0)" }}>
                <Lock className="w-4 h-4 mr-2" />
                Close {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} ✓
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.55 0.18 145)" }}>
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Closed ✓</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
