/* ============================================================
   Law Firm CRM — Close Day Page
   Feature: Daily register close — see all payments for a day,
            confirm totals, lock the day with a green badge
   ============================================================ */

import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { useActiveMember } from "@/contexts/ActiveMemberContext";
import { formatCurrency, formatDate } from "@/lib/store";
import { isConvertedStage } from "@shared/const";
import { todayPST, addDaysPST } from "@/lib/timezone";
import { PSTDatePicker } from "@/components/PSTDatePicker";
import { CalendarCheck, Lock, CheckCircle, ChevronLeft, ChevronRight, User, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { downloadCloseDayReportPng } from "@/lib/closeDayReport";

function todayStr() {
  return todayPST();
}

export default function CloseDay() {
  const { leads, payments, dayCloses, closeDay, isDayClosed, getDayClose, targets } = useCRM();
  const { activeMember } = useActiveMember();
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
  const selectedMonth = selectedDate.slice(0, 7);
  const mtdPayments = useMemo(() => payments.filter(payment => payment.date.startsWith(selectedMonth)), [payments, selectedMonth]);
  const mtdReceived = useMemo(() => mtdPayments.reduce((sum, payment) => sum + payment.amount, 0), [mtdPayments]);
  const mtdBooked = useMemo(() => leads.filter(lead => isConvertedStage(lead.stage) && (lead.convertedDate ?? lead.date).startsWith(selectedMonth)).reduce((sum, lead) => sum + lead.retainerBooked, 0), [leads, selectedMonth]);
  const weekday = new Date(`${selectedDate}T12:00:00`).getDay();
  const weekStart = addDaysPST(selectedDate, -((weekday + 6) % 7));
  const weekEnd = addDaysPST(weekStart, 6);
  const weeklyReceived = useMemo(() => payments.filter(payment => payment.date >= weekStart && payment.date <= weekEnd).reduce((sum, payment) => sum + payment.amount, 0), [payments, weekStart, weekEnd]);

  const closed = isDayClosed(selectedDate);
  const closeRecord = getDayClose(selectedDate);

  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const deleteDayCloseMut = trpc.dayCloses.delete.useMutation({
    onSuccess: () => {
      utils.dayCloses.list.invalidate();
      toast.success("Close record deleted");
      setConfirmDeleteDate(null);
    },
    onError: () => toast.error("Failed to delete close record"),
  });

  const prevDay = () => setSelectedDate(addDaysPST(selectedDate, -1));
  const nextDay = () => setSelectedDate(addDaysPST(selectedDate, 1));

  const handleClose = () => {
    closeDay(selectedDate, activeMember?.name);
    toast.success(
      activeMember
        ? `${formatDate(selectedDate)} closed by ${activeMember.name}`
        : `${formatDate(selectedDate)} closed successfully`
    );
  };

  const handleDownloadReport = () => {
    downloadCloseDayReportPng({
      dateLabel: selectedDate,
      payments: paymentsForDay,
      leadsReceived: leadsForDay.length,
      totalNew,
      totalExisting,
      totalRevenue: grandTotal,
      mtdReceived,
      mtdBooked,
      weeklyReceived,
      weeklyTarget: targets.weekly.green,
    });
    toast.success("PNG report downloaded — ready to share on WhatsApp.");
  };

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles", weekday: "long", year: "numeric", month: "long", day: "numeric"
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
          <div className="mt-1 flex justify-center">
            <PSTDatePicker value={selectedDate} onChange={v => { if (v) setSelectedDate(v); }} />
          </div>
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
              Closed at {new Date(closeRecord.closedAt).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" })}
              {closeRecord.closedBy && (
                <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded" style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "oklch(0.55 0.18 145)" }}>
                  <User className="w-3 h-3" />{closeRecord.closedBy}
                </span>
              )}
              {" · "}Total: {formatCurrency(closeRecord.totalRevenue)} ({formatCurrency(closeRecord.totalNew)} new + {formatCurrency(closeRecord.totalExisting)} existing)
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

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg p-4 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 28%)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Month to date — {new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "long", year: "numeric" })}</p>
          <div className="grid grid-cols-2 gap-4 mt-3"><div><p className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Received</p><p className="text-xl font-bold" style={{ color: "oklch(0.55 0.18 145)" }}>{formatCurrency(mtdReceived)}</p></div><div><p className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Booked</p><p className="text-xl font-bold" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(mtdBooked)}</p></div></div>
        </div>
        <div className="rounded-lg p-4 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.55 0.18 145 / 28%)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "oklch(0.55 0.18 145)" }}>Weekly target — {weekStart} to {weekEnd}</p>
          <p className="text-xl font-bold mt-3" style={{ color: weeklyReceived >= targets.weekly.green ? "oklch(0.55 0.18 145)" : "oklch(0.93 0.005 250)" }}>{formatCurrency(weeklyReceived)} <span className="text-sm font-normal" style={{ color: "oklch(0.55 0.01 250)" }}>of {formatCurrency(targets.weekly.green)}</span></p>
          <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: "oklch(1 0 0 / 10%)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (weeklyReceived / Math.max(1, targets.weekly.green)) * 100)}%`, background: "oklch(0.55 0.18 145)" }} /></div>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isConvertedStage(l.stage) ? "badge-retained" : l.stage === "Lost" ? "badge-lost" : l.stage === "Consultation" ? "badge-consultation" : l.stage === "Follow-Up" ? "badge-follow-up" : "badge-new"}`}>
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
            <Button variant="outline" onClick={handleDownloadReport} style={{ borderColor: "oklch(0.72 0.12 75 / 45%)", color: "oklch(0.72 0.12 75)" }}>
              <Download className="w-4 h-4 mr-2" /> Download PNG
            </Button>
            {!closed ? (
              <Button onClick={handleClose} style={{ background: "oklch(0.55 0.18 145)", color: "oklch(0.98 0 0)" }}>
                <Lock className="w-4 h-4 mr-2" />
                Close {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" })} ✓
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
      {/* Close History */}
      {(() => {
        const history = dayCloses.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
        if (history.length === 0) return null;
        return (
          <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.22 0.025 250)" }}>
              <CalendarCheck className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
              <span className="text-sm font-semibold" style={{ color: "oklch(0.80 0.005 250)" }}>Close History</span>
              <span className="text-xs ml-auto" style={{ color: "oklch(0.45 0.01 250)" }}>Last {history.length} closes</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "oklch(0.55 0.01 250)" }}>Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: "oklch(0.55 0.18 145)" }}>New</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: "oklch(0.55 0.15 200)" }}>Existing</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>Total</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: "oklch(0.55 0.01 250)" }}>Closed By</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: "oklch(0.55 0.01 250)" }}>Time</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: "oklch(0.55 0.01 250)" }}></th>
                </tr>
              </thead>
              <tbody>
                {history.map(dc => (
                  <tr key={dc.date} className="border-b group" style={{ borderColor: "oklch(1 0 0 / 5%)", background: dc.date === selectedDate ? "oklch(0.72 0.12 75 / 5%)" : undefined }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "oklch(0.80 0.005 250)" }}>
                      {new Date(dc.date + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "oklch(0.55 0.18 145)" }}>{formatCurrency(dc.totalNew)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "oklch(0.55 0.15 200)" }}>{formatCurrency(dc.totalExisting)}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(dc.totalRevenue)}</td>
                    <td className="px-4 py-3 text-right">
                      {dc.closedBy ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.55 0.18 145)" }}>
                          <User className="w-3 h-3" />{dc.closedBy}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "oklch(0.35 0.01 250)" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                      {new Date(dc.closedAt).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmDeleteDate === dc.date ? (
                        <span className="inline-flex items-center gap-1">
                          <button
                            onClick={() => deleteDayCloseMut.mutate({ date: dc.date })}
                            className="text-xs px-2 py-0.5 rounded font-semibold"
                            style={{ background: "oklch(0.60 0.22 25 / 20%)", color: "oklch(0.75 0.18 25)" }}
                          >Yes</button>
                          <button
                            onClick={() => setConfirmDeleteDate(null)}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ color: "oklch(0.55 0.01 250)" }}
                          >No</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteDate(dc.date)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 transition-all"
                          style={{ color: "oklch(0.60 0.22 25)" }}
                          title="Delete close record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}
