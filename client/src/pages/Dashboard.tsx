/* ============================================================
   Law Firm CRM — Dashboard Page
   Design: Dark Luxury Legal — Navy + Gold
   Features: 7 stat cards, targets tracker, weekly bar chart
   ============================================================ */

import { useState, useMemo, useEffect } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { trpc } from "@/lib/trpc";
import {
  formatCurrency,
  getMonthLeads,
  getMonthPayments,
  getWeeksInMonth,
  getTargetStatus,
  getDueTodayFollowUps,
  getOverdueFollowUps,
} from "@/lib/store";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserCheck,
  TrendingUp,
  DollarSign,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Download,
  Bell,
  AlertCircle,
  X,
  Phone,
  FileText,
  Loader2,
  Sunrise,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Clock3,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";
import LeadDetailPanel from "@/components/LeadDetailPanel";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── CSV Export Helper ────────────────────────────────────────
function escapeCSV(val: string | number | undefined): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map(r => r.map(escapeCSV).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const { leads, payments, followUps, dayCloses, targets } = useCRM();
  const crmData = useMemo(() => ({ leads, payments, followUps, dayCloses }), [leads, payments, followUps, dayCloses]);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [panelLeadId, setPanelLeadId] = useState<string | null>(null);
  const [panelInitialTab, setPanelInitialTab] = useState<"followups" | "notes" | "info" | "installments">("installments");
  // Drill-down drawer
  type DrillKey = "leads" | "converted" | "revBooked" | "newClient" | "existingClient" | "totalReceived" | null;
  const [drillDown, setDrillDown] = useState<DrillKey>(null); // current month

  const monthLeads = useMemo(() => getMonthLeads(crmData as any, selectedYear, selectedMonth), [crmData, selectedYear, selectedMonth]);
  const monthPayments = useMemo(() => getMonthPayments(crmData as any, selectedYear, selectedMonth), [crmData, selectedYear, selectedMonth]);

  // Stats
  const totalLeads = monthLeads.length;
  // Converted: leads that were converted in this month (by convertedDate or date)
  const converted = useMemo(() => {
    return leads.filter(l => {
      if (l.stage !== "Retained") return false;
      const dateToCheck = l.convertedDate || l.date;
      const d = new Date(dateToCheck + "T12:00:00");
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    }).length;
  }, [leads, selectedYear, selectedMonth]);
  const convRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  // Revenue Booked: sum retainerBooked for leads converted in the selected month
  // Use convertedDate if available, otherwise fall back to lead intake date
  const revenueBooked = useMemo(() => {
    return leads.filter(l => {
      if (l.stage !== "Retained") return false;
      const dateToCheck = l.convertedDate || l.date;
      const d = new Date(dateToCheck + "T12:00:00");
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    }).reduce((s, l) => s + l.retainerBooked, 0);
  }, [leads, selectedYear, selectedMonth]);
  const newClientRev = monthPayments.filter(p => p.paymentType === "New Client").reduce((s, p) => s + p.amount, 0);
  const existingClientRev = monthPayments.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + p.amount, 0);
  const totalReceived = newClientRev + existingClientRev;
  const pctOfBooked = revenueBooked > 0 ? Math.round((totalReceived / revenueBooked) * 100) : 0;

  // Weekly data
  const weeks = useMemo(() => getWeeksInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const weeklyData = useMemo(() => weeks.map(w => {
    // Pure YYYY-MM-DD string comparison — no Date objects, no timezone issues
    const wPayments = payments.filter(p => p.date >= w.startStr && p.date <= w.endStr);
    const newRev = wPayments.filter(p => p.paymentType === "New Client").reduce((s, p) => s + p.amount, 0);
    const existRev = wPayments.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + p.amount, 0);
    return { name: w.label, "New Client": newRev, "Existing Client": existRev, total: newRev + existRev };
  }), [payments, weeks]);

  // Monthly target status
  const monthStatus = getTargetStatus(totalReceived, "monthly", targets);

  // Calendar view
  const [showCalendar, setShowCalendar] = useState(false);
  const [calPopoverDay, setCalPopoverDay] = useState<string | null>(null);

  // Daily revenue map: YYYY-MM-DD → { total, payments[] }
  const dailyMap = useMemo(() => {
    const map: Record<string, { total: number; payments: typeof monthPayments }> = {};
    monthPayments.forEach(p => {
      if (!map[p.date]) map[p.date] = { total: 0, payments: [] };
      map[p.date].total += p.amount;
      map[p.date].payments.push(p);
    });
    return map;
  }, [monthPayments]);

  // Calendar grid: array of { dateStr, day } with leading nulls for offset
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDow = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0=Sun
    const cells: (null | string)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${selectedYear}-${String(selectedMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    }
    return cells;
  }, [selectedYear, selectedMonth]);

  // Max daily revenue for heatmap intensity scaling
  const maxDailyRev = useMemo(() => {
    const vals = Object.values(dailyMap).map(v => v.total);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [dailyMap]);

  // Case type revenue breakdown
  const caseTypeData = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    monthPayments.forEach(p => {
      const ct = p.caseType || "Unknown";
      if (!map[ct]) map[ct] = { revenue: 0, count: 0 };
      map[ct].revenue += p.amount;
      map[ct].count += 1;
    });
    return Object.entries(map)
      .map(([caseType, { revenue, count }]) => ({ caseType, revenue, count, pct: totalReceived > 0 ? Math.round((revenue / totalReceived) * 100) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [monthPayments, totalReceived]);

  // Revenue Velocity: cumulative actual vs. ideal pace
  const velocityData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthlyTarget = targets.monthly.green;
    const dailyIdeal = monthlyTarget / daysInMonth;
    const result: { day: number; actual: number; ideal: number }[] = [];
    let cumulative = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cumulative += dailyMap[dateStr]?.total ?? 0;
      result.push({ day: d, actual: cumulative, ideal: Math.round(dailyIdeal * d) });
    }
    return result;
  }, [dailyMap, selectedYear, selectedMonth, targets]);

  // Month-over-Month comparison
  const momComparison = useMemo(() => {
    const prevM = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevY = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevPayments = payments.filter(p => {
      const d = new Date(p.date + "T12:00:00");
      return d.getFullYear() === prevY && d.getMonth() + 1 === prevM;
    });
    const prevTotal = prevPayments.reduce((s, p) => s + p.amount, 0);
    const prevLeads = leads.filter(l => {
      const d = new Date(l.date + "T12:00:00");
      return d.getFullYear() === prevY && d.getMonth() + 1 === prevM;
    }).length;
    const prevConverted = leads.filter(l => {
      if (l.stage !== "Retained") return false;
      const dateToCheck = l.convertedDate || l.date;
      const d = new Date(dateToCheck + "T12:00:00");
      return d.getFullYear() === prevY && d.getMonth() + 1 === prevM;
    }).length;
    return {
      prevTotal, prevLeads, prevConverted,
      prevMonth: MONTHS[prevM - 1],
      revChange: prevTotal > 0 ? Math.round(((totalReceived - prevTotal) / prevTotal) * 100) : null,
      leadsChange: prevLeads > 0 ? Math.round(((totalLeads - prevLeads) / prevLeads) * 100) : null,
    };
  }, [payments, leads, selectedYear, selectedMonth, totalReceived, totalLeads]);

  // Overdue installments
  const utils = trpc.useUtils();
  const { data: overdueInstallments = [] } = trpc.getOverdueInstallments.useQuery(undefined, {
    refetchInterval: 60_000, // refresh every minute
  });
  const bulkRescheduleMut = trpc.bulkRescheduleOverdue.useMutation({
    onSuccess: () => utils.getOverdueInstallments.invalidate(),
  });
  const { data: dueThisWeekInstallments = [] } = trpc.getDueThisWeekInstallments.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  // CEO Morning Briefing collapsed state (persisted)
  const [briefingOpen, setBriefingOpen] = useState(() => {
    try { return localStorage.getItem("crm_briefing_open") !== "false"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem("crm_briefing_open", String(briefingOpen)); } catch {}
  }, [briefingOpen]);

  // Yesterday stats
  const yesterdayStr = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, []);
  const yesterdayPayments = useMemo(() => payments.filter(p => p.date === yesterdayStr), [payments, yesterdayStr]);
  const yesterdayRevenue = useMemo(() => yesterdayPayments.reduce((s, p) => s + p.amount, 0), [yesterdayPayments]);
  const yesterdayLeads = useMemo(() => leads.filter(l => l.date === yesterdayStr).length, [leads, yesterdayStr]);

  // Today's stats
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Follow-up urgency counts
  const overdueFollowUps = useMemo(() => followUps.filter(f => f.status === "Pending" && f.dueDate < todayStr), [followUps, todayStr]);
  const dueTodayFollowUps = useMemo(() => followUps.filter(f => f.status === "Pending" && f.dueDate === todayStr), [followUps, todayStr]);
  const todayPayments = payments.filter(p => p.date === todayStr);
  const todayNew = todayPayments.filter(p => p.paymentType === "New Client").reduce((s, p) => s + p.amount, 0);
  const todayExisting = todayPayments.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + p.amount, 0);
  const todayTotal = todayNew + todayExisting;
  const todayLeads = leads.filter(l => l.date === todayStr).length;

  // Stale leads: active (non-lost, non-retained) leads with no payment or follow-up activity in 14+ days
  // Activity = latest payment date OR latest follow-up date OR lead creation date
  const staleLeads = useMemo(() => {
    const cutoffMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return leads.filter(l => {
      if (l.stage === "Lost" || l.stage === "Retained") return false;
      // Find latest activity: last payment or last follow-up for this lead
      const lastPaymentDate = payments
        .filter(p => p.leadId === l.id)
        .map(p => new Date(p.date + "T12:00:00").getTime())
        .reduce((max, t) => Math.max(max, t), 0);
      const lastFollowUpDate = followUps
        .filter(f => f.leadId === l.id)
        .map(f => new Date(f.dueDate + "T12:00:00").getTime())
        .reduce((max, t) => Math.max(max, t), 0);
      const createdMs = new Date(l.date + "T12:00:00").getTime();
      const lastActivity = Math.max(createdMs, lastPaymentDate, lastFollowUpDate);
      return lastActivity < cutoffMs;
    }).length;
  }, [leads, payments, followUps]);
  // Use convertedDate for today's conversion count so same-day converts show immediately
  const todayConverted = leads.filter(l => l.stage === "Retained" && (l.convertedDate === todayStr || (!l.convertedDate && l.date === todayStr))).length;

  // Drill-down data
  const drillLeads = useMemo(() => monthLeads, [monthLeads]);
  const drillConverted = useMemo(() => leads.filter(l => {
    if (l.stage !== "Retained") return false;
    const dateToCheck = l.convertedDate || l.date;
    const d = new Date(dateToCheck + "T12:00:00");
    return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
  }), [leads, selectedYear, selectedMonth]);
  const drillRevBooked = drillConverted;
  const drillNewClient = useMemo(() => monthPayments.filter(p => p.paymentType === "New Client"), [monthPayments]);
  const drillExisting = useMemo(() => monthPayments.filter(p => p.paymentType === "Existing Client"), [monthPayments]);
  const drillTotal = monthPayments;

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // ─── Export CSV ──────────────────────────────────────────
  const handleExport = () => {
    const monthLabel = `${MONTHS[selectedMonth - 1]}_${selectedYear}`;

    // Section 1: Summary
    const summaryRows: string[][] = [
      ["LAW FIRM CRM — MONTHLY REPORT"],
      [`Month: ${MONTHS[selectedMonth - 1]} ${selectedYear}`],
      [`Exported: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
      [],
      ["SUMMARY"],
      ["Metric", "Value"],
      ["Leads In", String(totalLeads)],
      ["Converted", String(converted)],
      ["Conversion Rate", `${convRate}%`],
      ["Revenue Booked", String(revenueBooked)],
      ["New Client Revenue Received", String(newClientRev)],
      ["Existing Client Revenue Received", String(existingClientRev)],
      ["Total Revenue Received", String(totalReceived)],
      ["% of Booked Collected", `${pctOfBooked}%`],
      [],
    ];

    // Section 2: Payments
    const paymentRows: string[][] = [
      ["PAYMENTS"],
      ["Date", "Client Name", "Case Type", "Case Number", "Payment Type", "Amount", "Received For", "Notes"],
      ...monthPayments
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(p => [
          p.date,
          p.clientName,
          p.caseType,
          p.caseNumber || "",
          p.paymentType,
          String(p.amount),
          p.receivedFor,
          p.notes || "",
        ]),
      [],
    ];

    // Section 3: Leads
    const leadRows: string[][] = [
      ["LEADS"],
      ["Date", "Name", "Phone", "Email", "Case Type", "Case Number", "Stage", "Source", "Retainer Booked", "Downpayment", "Converted Date", "Notes"],
      ...monthLeads
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(l => [
          l.date,
          l.name,
          l.phone || "",
          l.email || "",
          l.caseType,
          l.caseNumber || "",
          l.stage,
          l.source || "",
          String(l.retainerBooked || 0),
          String(l.downpayment || 0),
          l.convertedDate || "",
          l.notes || "",
        ]),
    ];

    downloadCSV(
      `LawFirmCRM_${monthLabel}_Report.csv`,
      [...summaryRows, ...paymentRows, ...leadRows]
    );
  };

  const statusColors = {
    green: { bg: "oklch(0.55 0.18 145 / 15%)", border: "oklch(0.55 0.18 145 / 40%)", text: "oklch(0.70 0.18 145)", label: "ON TARGET" },
    yellow: { bg: "oklch(0.72 0.15 80 / 15%)", border: "oklch(0.72 0.15 80 / 40%)", text: "oklch(0.80 0.15 80)", label: "APPROACHING" },
    red: { bg: "oklch(0.60 0.22 25 / 15%)", border: "oklch(0.60 0.22 25 / 40%)", text: "oklch(0.70 0.22 25)", label: "BELOW TARGET" },
  };

  const sc = statusColors[monthStatus];

  return (
    <>
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
            Operations Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
            {MONTHS[selectedMonth - 1]} {selectedYear} · Law Firm CRM
          </p>
        </div>
        {/* Right controls: Export + Month selector */}
        <div className="flex items-center gap-3">
          {/* Export CSV button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-95"
            style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 40%)", color: "oklch(0.72 0.12 75)" }}
            title={`Download ${MONTHS[selectedMonth - 1]} ${selectedYear} report as CSV`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Month selector */}
          <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: "oklch(0.55 0.01 250)" }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.80 0.005 250)" }}>
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: "oklch(0.55 0.01 250)" }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>

      {/* ── CEO Morning Briefing ─────────────────────────── */}
      <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 30%)" }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer select-none hover:bg-white/3 transition-colors"
          onClick={() => setBriefingOpen(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Sunrise className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
              Morning Briefing
            </span>
            <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>
          {briefingOpen
            ? <ChevronUp className="w-4 h-4" style={{ color: "oklch(0.55 0.01 250)" }} />
            : <ChevronDown className="w-4 h-4" style={{ color: "oklch(0.55 0.01 250)" }} />}
        </button>
        {briefingOpen && (
          <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {/* Yesterday Revenue */}
              <div className="rounded-lg p-3" style={{ background: "oklch(0.22 0.025 250)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.12 75)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Yesterday Revenue</span>
                </div>
                <div className="text-xl font-bold" style={{ color: yesterdayRevenue > 0 ? "oklch(0.72 0.12 75)" : "oklch(0.50 0.01 250)" }}>
                  {formatCurrency(yesterdayRevenue)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>
                  {yesterdayPayments.length} payment{yesterdayPayments.length !== 1 ? "s" : ""}
                </div>
              </div>
              {/* Overdue Follow-Ups */}
              <div className="rounded-lg p-3" style={{ background: overdueFollowUps.length > 0 ? "oklch(0.60 0.22 25 / 12%)" : "oklch(0.22 0.025 250)", border: overdueFollowUps.length > 0 ? "1px solid oklch(0.60 0.22 25 / 30%)" : "none" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: overdueFollowUps.length > 0 ? "oklch(0.70 0.22 25)" : "oklch(0.55 0.01 250)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Overdue Follow-Ups</span>
                </div>
                <div className="text-xl font-bold" style={{ color: overdueFollowUps.length > 0 ? "oklch(0.70 0.22 25)" : "oklch(0.55 0.18 145)" }}>
                  {overdueFollowUps.length}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>
                  {overdueFollowUps.length === 0 ? "All clear" : "need attention"}
                </div>
              </div>
              {/* Due Today Follow-Ups */}
              <div className="rounded-lg p-3" style={{ background: dueTodayFollowUps.length > 0 ? "oklch(0.72 0.12 75 / 8%)" : "oklch(0.22 0.025 250)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock3 className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.12 75)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Due Today</span>
                </div>
                <div className="text-xl font-bold" style={{ color: dueTodayFollowUps.length > 0 ? "oklch(0.80 0.12 75)" : "oklch(0.55 0.01 250)" }}>
                  {dueTodayFollowUps.length}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>follow-ups</div>
              </div>
              {/* Overdue Installments */}
              <div className="rounded-lg p-3" style={{ background: overdueInstallments.length > 0 ? "oklch(0.60 0.22 25 / 12%)" : "oklch(0.22 0.025 250)", border: overdueInstallments.length > 0 ? "1px solid oklch(0.60 0.22 25 / 30%)" : "none" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckSquare className="w-3.5 h-3.5" style={{ color: overdueInstallments.length > 0 ? "oklch(0.70 0.22 25)" : "oklch(0.55 0.01 250)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Overdue Payments</span>
                </div>
                <div className="text-xl font-bold" style={{ color: overdueInstallments.length > 0 ? "oklch(0.70 0.22 25)" : "oklch(0.55 0.18 145)" }}>
                  {overdueInstallments.length}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>
                  {overdueInstallments.length === 0 ? "All on time" : "installments late"}
                </div>
              </div>
            </div>
            {/* Quick links */}
            <div className="flex gap-3 mt-3 flex-wrap">
              <Link href="/follow-ups">
                <span className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "oklch(0.72 0.12 75 / 12%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}>
                  View Follow-Ups
                </span>
              </Link>
              <Link href="/clients">
                <span className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "oklch(0.72 0.12 75 / 12%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}>
                  Client Ledger
                </span>
              </Link>
              <Link href="/leads">
                <span className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "oklch(0.72 0.12 75 / 12%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}>
                  Leads Pipeline
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Today Strip ─────────────────────────────────────── */}
      <div className="rounded-lg p-4 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 25%)" }}>
        <div className="flex items-center gap-2 mb-3">
          <CalendarCheck className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
            Today — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Leads In", value: todayLeads, icon: Users },
            { label: "Converted", value: todayConverted, icon: UserCheck },
            { label: "New Client $", value: formatCurrency(todayNew), icon: DollarSign },
            { label: "Existing Client $", value: formatCurrency(todayExisting), icon: BookOpen },
            { label: "Total Today", value: formatCurrency(todayTotal), icon: TrendingUp, highlight: true },
          ].map(({ label, value, icon: Icon, highlight }) => (
            <div key={label} className="text-center">
              <div className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 250)" }}>{label}</div>
              <div className="text-lg font-bold" style={{ color: highlight ? "oklch(0.72 0.12 75)" : "oklch(0.93 0.005 250)" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -- Due This Week Installments Strip */}
      {dueThisWeekInstallments.length > 0 && (
        <div className="rounded-lg p-4 border" style={{ background: "oklch(0.72 0.12 75 / 6%)", borderColor: "oklch(0.72 0.12 75 / 30%)" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
                Due This Week
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.72 0.12 75 / 20%)", color: "oklch(0.72 0.12 75)" }}>
                {dueThisWeekInstallments.length}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
              {dueThisWeekInstallments.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.75 0.01 250)" }}>
                  <button
                    onClick={() => { setPanelLeadId(String(item.leadId)); setPanelInitialTab("installments"); }}
                    className="font-medium hover:underline cursor-pointer"
                    style={{ color: "oklch(0.93 0.005 250)", background: "none", border: "none", padding: 0 }}
                  >{item.leadName}</button>
                  <span style={{ color: "oklch(0.55 0.01 250)" }}>·</span>
                  <span>{formatCurrency(item.amount)}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: item.dueDate === todayStr ? "oklch(0.72 0.12 75 / 20%)" : "oklch(0.22 0.025 250)", color: item.dueDate === todayStr ? "oklch(0.80 0.12 75)" : "oklch(0.55 0.01 250)" }}>
                    {item.dueDate === todayStr ? "TODAY" : item.dueDate}
                  </span>
                </div>
              ))}
              {dueThisWeekInstallments.length > 4 && (
                <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>+{dueThisWeekInstallments.length - 4} more</span>
              )}
            </div>
            <div className="text-xs font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>
              {formatCurrency(dueThisWeekInstallments.reduce((s, i) => s + i.amount, 0))} total
            </div>
          </div>
        </div>
      )}

      {/* -- Overdue Installments Alert Strip */}
      {overdueInstallments.length > 0 && (
        <div className="rounded-lg p-4 border" style={{ background: "oklch(0.70 0.22 25 / 8%)", borderColor: "oklch(0.70 0.22 25 / 35%)" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: "oklch(0.70 0.22 25)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.70 0.22 25)" }}>
                Overdue Installments
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.70 0.22 25 / 20%)", color: "oklch(0.70 0.22 25)" }}>
                {overdueInstallments.length}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
              {overdueInstallments.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.75 0.01 250)" }}>
                  <button
                    onClick={() => { setPanelLeadId(String(item.leadId)); setPanelInitialTab("installments"); }}
                    className="font-medium hover:underline cursor-pointer"
                    style={{ color: "oklch(0.93 0.005 250)", background: "none", border: "none", padding: 0 }}
                  >{item.leadName}</button>
                  <span style={{ color: "oklch(0.55 0.01 250)" }}>·</span>
                  <span>{formatCurrency(item.amount)}</span>
                  <span style={{ color: "oklch(0.55 0.01 250)" }}>due {item.dueDate}</span>
                </div>
              ))}
              {overdueInstallments.length > 4 && (
                <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>+{overdueInstallments.length - 4} more</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkRescheduleMut.mutate({ newDate: new Date().toISOString().slice(0, 10) })}
                disabled={bulkRescheduleMut.isPending}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "oklch(0.72 0.12 75 / 20%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 40%)" }}
              >
                {bulkRescheduleMut.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : null}
                Reschedule All to Today
              </button>
              <Link href="/leads">
                <span className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: "oklch(0.70 0.22 25 / 15%)", color: "oklch(0.70 0.22 25)", border: "1px solid oklch(0.70 0.22 25 / 35%)" }}>
                  View Leads
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* -- Follow-Up Alert Strip */}
      {(() => {
        const dueTodayFUs = getDueTodayFollowUps(crmData as any);
        const overdueFUs = getOverdueFollowUps(crmData as any);
        if (dueTodayFUs.length === 0 && overdueFUs.length === 0) return null;
        return (
          <div className="rounded-lg p-4 border flex items-start gap-4 flex-wrap" style={{ background: "oklch(0.70 0.22 25 / 8%)", borderColor: "oklch(0.70 0.22 25 / 35%)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Follow-Up Alerts</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap flex-1">
              {overdueFUs.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" style={{ color: "oklch(0.70 0.22 25)" }} />
                  <span className="text-sm font-semibold" style={{ color: "oklch(0.70 0.22 25)" }}>{overdueFUs.length} overdue</span>
                  <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                    {overdueFUs.slice(0, 2).map(f => {
                      const lead = leads.find(l => l.id === f.leadId);
                      return lead?.name || "Unknown";
                    }).join(", ")}{overdueFUs.length > 2 ? ` +${overdueFUs.length - 2} more` : ""}
                  </span>
                </div>
              )}
              {dueTodayFUs.length > 0 && (
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.12 75)" }} />
                  <span className="text-sm font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>{dueTodayFUs.length} due today</span>
                  <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                    {dueTodayFUs.slice(0, 2).map(f => {
                      const lead = leads.find(l => l.id === f.leadId);
                      return lead?.name || "Unknown";
                    }).join(", ")}{dueTodayFUs.length > 2 ? ` +${dueTodayFUs.length - 2} more` : ""}
                  </span>
                </div>
              )}
            </div>
            <Link href="/follow-ups">
              <span className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-90 cursor-pointer"
                style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 35%)" }}>
                View All
              </span>
            </Link>
          </div>
        );
      })()}

            {/* ── 7 Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Leads In" value={totalLeads} sub="this month" onClick={() => setDrillDown("leads")} />
        <StatCard icon={<UserCheck className="w-4 h-4" />} label="Converted" value={converted} sub={`${convRate}% conv. rate`} onClick={() => setDrillDown("converted")} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Conv. Rate" value={`${convRate}%`} sub={`${converted} of ${totalLeads}`} onClick={() => setDrillDown("converted")} />
        <StatCard icon={<BookOpen className="w-4 h-4" />} label="Rev. Booked" value={formatCurrency(revenueBooked)} sub={`${converted} retainers signed`} gold onClick={() => setDrillDown("revBooked")} />
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="New Client $" value={formatCurrency(newClientRev)} sub="from new clients" onClick={() => setDrillDown("newClient")} />
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="Existing Client $" value={formatCurrency(existingClientRev)} sub="from ongoing cases" onClick={() => setDrillDown("existingClient")} />
        <StatCard
          icon={<ArrowUpRight className="w-4 h-4" />}
          label="Total Received"
          value={formatCurrency(totalReceived)}
          sub={`${pctOfBooked}% of booked`}
          statusColor={sc.text}
          statusBg={sc.bg}
          statusBorder={sc.border}
          statusLabel={sc.label}
          onClick={() => setDrillDown("totalReceived")}
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Stale Leads"
          value={staleLeads}
          sub="active, >14 days old"
          statusColor={staleLeads > 0 ? "oklch(0.70 0.22 25)" : "oklch(0.65 0.18 145)"}
          statusBg={staleLeads > 0 ? "oklch(0.70 0.22 25 / 10%)" : "oklch(0.65 0.18 145 / 10%)"}
          statusBorder={staleLeads > 0 ? "oklch(0.70 0.22 25 / 30%)" : "oklch(0.65 0.18 145 / 30%)"}
          statusLabel={staleLeads > 0 ? `${staleLeads} need attention` : "All fresh"}
        />
      </div>

      {/* ── Targets Tracker ─────────────────────────────────── */}
      <div className="rounded-lg p-5 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
            Revenue Targets
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Monthly */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "oklch(0.65 0.01 250)" }}>Monthly Target</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                {sc.label}
              </span>
            </div>
            <div className="relative h-4 rounded-full overflow-hidden mb-2" style={{ background: "oklch(0.22 0.025 250)" }}>
              {/* Red zone */}
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (targets.monthly.yellow / 80000) * 100)}%`, background: "oklch(0.60 0.22 25 / 30%)" }} />
              {/* Yellow zone */}
              <div className="absolute inset-y-0 rounded-full" style={{ left: `${(targets.monthly.yellow / 80000) * 100}%`, width: `${((targets.monthly.green - targets.monthly.yellow) / 80000) * 100}%`, background: "oklch(0.72 0.15 80 / 30%)" }} />
              {/* Green zone */}
              <div className="absolute inset-y-0 rounded-full" style={{ left: `${(targets.monthly.green / 80000) * 100}%`, right: 0, background: "oklch(0.55 0.18 145 / 30%)" }} />
              {/* Progress */}
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (totalReceived / 80000) * 100)}%`, background: sc.text }} />
            </div>
            <div className="flex justify-between text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>
              <span>{formatCurrency(totalReceived)}</span>
              <span>Target: {formatCurrency(80000)}</span>
            </div>
            {totalReceived < targets.monthly.green && (
              <div className="text-xs mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
                {formatCurrency(targets.monthly.green - totalReceived)} to reach green zone
              </div>
            )}
          </div>
          {/* Weekly */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "oklch(0.65 0.01 250)" }}>Weekly Breakdown</span>
              <div className="flex items-center gap-3 text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>
                <span>🟢 $17.5k</span>
                <span>🟡 $12.5k</span>
              </div>
            </div>
            <div className="space-y-2">
              {weeklyData.map((w, i) => {
                const wStatus = getTargetStatus(w.total, "weekly", targets);
                const wSc = statusColors[wStatus];
                const pct = Math.min(100, (w.total / 20000) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs w-14 flex-shrink-0" style={{ color: "oklch(0.55 0.01 250)" }}>{w.name}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden relative" style={{ background: "oklch(0.22 0.025 250)" }}>
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: wSc.text }} />
                      {/* Yellow tick */}
                      <div className="absolute inset-y-0 w-px" style={{ left: `${(targets.weekly.yellow / 20000) * 100}%`, background: "oklch(0.72 0.15 80 / 60%)" }} />
                      {/* Green tick */}
                      <div className="absolute inset-y-0 w-px" style={{ left: `${(targets.weekly.green / 20000) * 100}%`, background: "oklch(0.55 0.18 145 / 60%)" }} />
                    </div>
                    <span className="text-xs w-16 text-right font-medium" style={{ color: wSc.text }}>{formatCurrency(w.total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Weekly Revenue Chart ─────────────────────────────── */}
      <div className="rounded-lg p-5 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
            Weekly Revenue — {MONTHS[selectedMonth - 1]} {selectedYear}
          </h2>
          <div className="flex items-center gap-4 text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "oklch(0.72 0.12 75)" }} />New Client</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "oklch(0.35 0.05 250)" }} />Existing Client</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: "oklch(0.55 0.18 145)" }} />$17.5k</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: "oklch(0.72 0.15 80)" }} />$12.5k</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
            <XAxis dataKey="name" tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)", borderRadius: "8px", color: "oklch(0.93 0.005 250)" }}
              formatter={(v: number, name: string) => [formatCurrency(v), name]}
            />
            <ReferenceLine y={targets.weekly.green} stroke="oklch(0.55 0.18 145)" strokeDasharray="6 3" strokeWidth={1.5} />
            <ReferenceLine y={targets.weekly.yellow} stroke="oklch(0.72 0.15 80)" strokeDasharray="6 3" strokeWidth={1.5} />
            <Bar dataKey="New Client" stackId="a" fill="oklch(0.72 0.12 75)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Existing Client" stackId="a" fill="oklch(0.35 0.05 250)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Revenue Velocity Chart ────────────────────── */}
      <div className="rounded-lg p-5 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
              Revenue Velocity — {MONTHS[selectedMonth - 1]} {selectedYear}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 inline-block" style={{ borderColor: "oklch(0.72 0.12 75)" }} />
              Actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: "oklch(0.55 0.18 145)" }} />
              Ideal Pace
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={velocityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="velActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
            <XAxis dataKey="day" tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={d => d % 5 === 0 || d === 1 ? String(d) : ""} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)", borderRadius: "8px", color: "oklch(0.93 0.005 250)" }}
              formatter={(v: number, name: string) => [formatCurrency(v), name === "actual" ? "Actual" : "Ideal Pace"]}
              labelFormatter={d => `Day ${d}`}
            />
            <ReferenceLine y={targets.monthly.green} stroke="oklch(0.55 0.18 145)" strokeDasharray="6 3" strokeWidth={1.5} />
            <Area type="monotone" dataKey="ideal" stroke="oklch(0.55 0.18 145)" strokeWidth={1.5} strokeDasharray="6 3" fill="none" dot={false} />
            <Area type="monotone" dataKey="actual" stroke="oklch(0.72 0.12 75)" strokeWidth={2} fill="url(#velActual)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Month-over-Month Comparison ────────────────── */}
      <div className="rounded-lg p-5 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
            Month-over-Month
          </h2>
          <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>
            vs. {momComparison.prevMonth}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Revenue",
              current: formatCurrency(totalReceived),
              prev: formatCurrency(momComparison.prevTotal),
              change: momComparison.revChange,
            },
            {
              label: "Leads In",
              current: String(totalLeads),
              prev: String(momComparison.prevLeads),
              change: momComparison.leadsChange,
            },
            {
              label: "Conversions",
              current: String(converted),
              prev: String(momComparison.prevConverted),
              change: momComparison.prevConverted > 0 ? Math.round(((converted - momComparison.prevConverted) / momComparison.prevConverted) * 100) : null,
            },
          ].map(({ label, current, prev, change }) => (
            <div key={label} className="rounded-lg p-3" style={{ background: "oklch(0.22 0.025 250)" }}>
              <div className="text-xs mb-1" style={{ color: "oklch(0.50 0.01 250)" }}>{label}</div>
              <div className="text-xl font-bold mb-1" style={{ color: "oklch(0.93 0.005 250)" }}>{current}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{prev} prev</span>
                {change !== null && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{
                    background: change >= 0 ? "oklch(0.55 0.18 145 / 15%)" : "oklch(0.60 0.22 25 / 15%)",
                    color: change >= 0 ? "oklch(0.65 0.18 145)" : "oklch(0.70 0.22 25)",
                  }}>
                    {change >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(change)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Calendar Revenue Heatmap ─────────────────── */}
      <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
        {/* Header row with toggle */}
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
          onClick={() => setShowCalendar(v => !v)}
          style={{ borderBottom: showCalendar ? "1px solid oklch(1 0 0 / 8%)" : "none" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "oklch(0.72 0.12 75)" }}>
            <CalendarCheck className="w-4 h-4" />
            Calendar View — {MONTHS[selectedMonth - 1]} {selectedYear}
          </h2>
          <ChevronRight
            className="w-4 h-4 transition-transform duration-200"
            style={{ color: "oklch(0.55 0.01 250)", transform: showCalendar ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        </div>

        {showCalendar && (
          <div className="p-5">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 15%)" }} />
                No revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "oklch(0.72 0.12 75 / 30%)" }} />
                Low
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "oklch(0.72 0.12 75 / 65%)" }} />
                Medium
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "oklch(0.72 0.12 75)" }} />
                High
              </span>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: "oklch(0.45 0.01 250)" }}>{d}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((dateStr, i) => {
                if (!dateStr) return <div key={`empty-${i}`} />;
                const day = parseInt(dateStr.slice(-2));
                const dayData = dailyMap[dateStr];
                const rev = dayData?.total ?? 0;
                const intensity = rev > 0 ? Math.max(0.15, rev / maxDailyRev) : 0;
                const isToday = dateStr === todayStr;
                const isOpen = calPopoverDay === dateStr;

                // Heatmap color
                const cellBg = rev > 0
                  ? `oklch(0.72 0.12 75 / ${Math.round(intensity * 100)}%)`
                  : "oklch(0.22 0.025 250)";
                const cellBorder = isToday
                  ? "oklch(0.72 0.12 75)"
                  : rev > 0
                    ? "oklch(0.72 0.12 75 / 30%)"
                    : "oklch(1 0 0 / 8%)";

                return (
                  <div key={dateStr} className="relative">
                    <button
                      onClick={() => setCalPopoverDay(isOpen ? null : dateStr)}
                      className="w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: cellBg,
                        border: `1px solid ${cellBorder}`,
                        outline: isOpen ? `2px solid oklch(0.72 0.12 75)` : "none",
                        outlineOffset: "2px",
                      }}
                      title={rev > 0 ? `${dateStr}: ${formatCurrency(rev)}` : dateStr}
                    >
                      <span className="text-xs font-semibold leading-none" style={{ color: rev > 0 ? "oklch(0.10 0.01 250)" : "oklch(0.50 0.01 250)" }}>{day}</span>
                      {rev > 0 && (
                        <span className="text-[9px] leading-none font-medium" style={{ color: "oklch(0.15 0.01 250)" }}>
                          ${rev >= 1000 ? `${(rev/1000).toFixed(1)}k` : rev}
                        </span>
                      )}
                    </button>

                    {/* Day popover */}
                    {isOpen && dayData && (
                      <div
                        className="absolute z-50 rounded-xl shadow-2xl p-4 min-w-[220px]"
                        style={{
                          background: "oklch(0.20 0.025 250)",
                          border: "1px solid oklch(0.72 0.12 75 / 40%)",
                          top: "calc(100% + 8px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
                            {new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                          <span className="text-sm font-bold" style={{ color: "oklch(0.93 0.005 250)" }}>{formatCurrency(rev)}</span>
                        </div>
                        <div className="space-y-2">
                          {dayData.payments.map((p, pi) => (
                            <div key={pi} className="flex items-start justify-between gap-3 text-xs" style={{ borderTop: pi > 0 ? "1px solid oklch(1 0 0 / 8%)" : "none", paddingTop: pi > 0 ? "8px" : "0" }}>
                              <div>
                                <div className="font-medium" style={{ color: "oklch(0.85 0.005 250)" }}>{p.clientName}</div>
                                <div style={{ color: "oklch(0.50 0.01 250)" }}>{p.caseType} · {p.paymentType === "New Client" ? "New" : "Existing"}</div>
                              </div>
                              <div className="font-semibold shrink-0" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(p.amount)}</div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setCalPopoverDay(null); }}
                          className="mt-3 w-full text-xs py-1.5 rounded-lg transition-colors hover:bg-white/5"
                          style={{ color: "oklch(0.45 0.01 250)", border: "1px solid oklch(1 0 0 / 10%)" }}
                        >Close</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Monthly total footer */}
            <div className="mt-4 pt-4 flex items-center justify-between text-xs" style={{ borderTop: "1px solid oklch(1 0 0 / 8%)", color: "oklch(0.55 0.01 250)" }}>
              <span>{Object.keys(dailyMap).length} days with revenue</span>
              <span className="font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>Total: {formatCurrency(totalReceived)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Case Type Revenue Breakdown ─────────────────────── */}
      <div className="rounded-lg p-5 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "oklch(0.72 0.12 75)" }}>
            Revenue by Case Type — {MONTHS[selectedMonth - 1]} {selectedYear}
          </h2>
          {caseTypeData.length > 0 && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={Math.max(160, caseTypeData.length * 44)}>
              <BarChart data={caseTypeData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="caseType" tick={{ fill: "oklch(0.80 0.01 250)", fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)", borderRadius: "8px", color: "oklch(0.93 0.005 250)" }}
                  formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="oklch(0.72 0.12 75)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Summary table */}
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 10%)" }}>
                    <th className="text-left py-2 pr-4 font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>Case Type</th>
                    <th className="text-right py-2 pr-4 font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>Payments</th>
                    <th className="text-right py-2 pr-4 font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>Revenue</th>
                    <th className="text-right py-2 font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {caseTypeData.map((row, i) => (
                    <tr key={row.caseType} style={{ borderBottom: i < caseTypeData.length - 1 ? "1px solid oklch(1 0 0 / 6%)" : "none" }}>
                      <td className="py-2 pr-4" style={{ color: "oklch(0.93 0.005 250)" }}>
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{row.caseType}</span>
                      </td>
                      <td className="text-right py-2 pr-4" style={{ color: "oklch(0.65 0.01 250)" }}>{row.count}</td>
                      <td className="text-right py-2 pr-4 font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>{formatCurrency(row.revenue)}</td>
                      <td className="text-right py-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 8%)" }}>
                            <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: "oklch(0.72 0.12 75)" }} />
                          </div>
                          <span className="text-xs w-8 text-right" style={{ color: "oklch(0.65 0.01 250)" }}>{row.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "1px solid oklch(1 0 0 / 12%)" }}>
                    <td className="pt-2 pr-4 font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>Total</td>
                    <td className="text-right pt-2 pr-4" style={{ color: "oklch(0.65 0.01 250)" }}>{caseTypeData.reduce((s, r) => s + r.count, 0)}</td>
                    <td className="text-right pt-2 pr-4 font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(totalReceived)}</td>
                    <td className="text-right pt-2" style={{ color: "oklch(0.65 0.01 250)" }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>}
          {caseTypeData.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: "oklch(0.45 0.01 250)" }}>
              No payments recorded for {MONTHS[selectedMonth - 1]} {selectedYear}.
            </p>
          )}
      </div>

      {/* ── Lead Source ROI + Pipeline Value ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Source ROI */}
        <div className="rounded-lg p-5 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Lead Source</h2>
            <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{MONTHS[selectedMonth - 1]} {selectedYear}</span>
          </div>
          {(() => {
            // Filter leads created in the selected month/year
            const monthLeads = leads.filter(l => {
              const d = new Date(l.date);
              return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
            });
            const sourceMap: Record<string, { leads: number; converted: number; revenue: number }> = {};
            monthLeads.forEach(l => {
              const src = l.source || "Unknown";
              if (!sourceMap[src]) sourceMap[src] = { leads: 0, converted: 0, revenue: 0 };
              sourceMap[src].leads += 1;
              if (l.stage === "Retained") {
                sourceMap[src].converted += 1;
                sourceMap[src].revenue += l.retainerBooked || 0;
              }
            });
            const rows = Object.entries(sourceMap)
              .map(([src, d]) => ({ src, ...d, convRate: d.leads > 0 ? Math.round((d.converted / d.leads) * 100) : 0 }))
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 6);
            if (rows.length === 0) return <p className="text-sm text-center py-6" style={{ color: "oklch(0.45 0.01 250)" }}>No lead source data for this month.</p>;
            return (
              <div>
                {/* Header row */}
                <div className="grid grid-cols-4 gap-2 mb-2 px-1">
                  <span className="text-xs col-span-1" style={{ color: "oklch(0.45 0.01 250)" }}>Source</span>
                  <span className="text-xs text-center" style={{ color: "oklch(0.45 0.01 250)" }}>Leads</span>
                  <span className="text-xs text-center" style={{ color: "oklch(0.45 0.01 250)" }}>Conv.</span>
                  <span className="text-xs text-right" style={{ color: "oklch(0.45 0.01 250)" }}>Revenue</span>
                </div>
                <div className="space-y-1.5">
                  {rows.map(row => (
                    <div key={row.src} className="grid grid-cols-4 gap-2 items-center rounded px-1 py-1.5" style={{ background: "oklch(0.20 0.025 250)" }}>
                      <span className="text-xs font-medium truncate col-span-1" style={{ color: "oklch(0.80 0.005 250)" }}>{row.src}</span>
                      <span className="text-xs text-center" style={{ color: "oklch(0.65 0.01 250)" }}>{row.leads}</span>
                      <span className="text-xs text-center font-semibold" style={{ color: row.convRate >= 50 ? "oklch(0.65 0.18 145)" : row.convRate >= 25 ? "oklch(0.72 0.12 75)" : "oklch(0.65 0.01 250)" }}>
                        {row.converted} <span className="font-normal opacity-70">({row.convRate}%)</span>
                      </span>
                      <span className="text-xs font-semibold text-right" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(row.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Pipeline Value Summary */}
        <div className="rounded-lg p-5 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Pipeline Value</h2>
            <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>active leads</span>
          </div>
          {(() => {
            const activeLeads = leads.filter(l => l.stage !== "Lost");
            const totalPipeline = activeLeads.reduce((s, l) => s + (l.retainerBooked || l.quotedAmount || 0), 0);
            const stageBreakdown = ["New Lead", "Consultation", "Retained"].map(stage => {
              const stageLeads = activeLeads.filter(l => l.stage === stage);
              const value = stageLeads.reduce((s, l) => s + (l.retainerBooked || l.quotedAmount || 0), 0);
              return { stage, count: stageLeads.length, value };
            });
            const stageColors: Record<string, string> = {
              "New Lead": "oklch(0.65 0.15 250)",
              "Consultation": "oklch(0.72 0.12 75)",
              "Retained": "oklch(0.55 0.18 145)",
            };
            return (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.72 0.12 75)" }}>
                    {formatCurrency(totalPipeline)}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>{activeLeads.length} active leads</div>
                </div>
                <div className="space-y-2">
                  {stageBreakdown.map(({ stage, count, value }) => (
                    <div key={stage} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: stageColors[stage] }}>{stage}</span>
                          <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>{count} leads</span>
                        </div>
                        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
                          <div className="h-full rounded-full" style={{ width: totalPipeline > 0 ? `${Math.round((value / totalPipeline) * 100)}%` : "0%", background: stageColors[stage] }} />
                        </div>
                      </div>
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: "oklch(0.80 0.005 250)" }}>{formatCurrency(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Lost Reasons Breakdown ────────────────────────────────── */}
      {(() => {
        const lostLeads = leads.filter(l => l.stage === "Lost" && l.lostReason);
        if (lostLeads.length === 0) return null;
        const reasonMap: Record<string, number> = {};
        lostLeads.forEach(l => {
          const r = l.lostReason || "Other";
          reasonMap[r] = (reasonMap[r] || 0) + 1;
        });
        const rows = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]);
        const maxCount = rows[0]?.[1] || 1;
        const reasonColors: Record<string, string> = {
          "Price": "oklch(0.70 0.22 25)",
          "Competitor": "oklch(0.65 0.15 250)",
          "Not Qualified": "oklch(0.60 0.20 60)",
          "No Response": "oklch(0.55 0.01 250)",
          "Other": "oklch(0.50 0.01 250)",
        };
        return (
          <div className="rounded-lg p-5 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4" style={{ color: "oklch(0.70 0.22 25)" }} />
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Lost Lead Reasons</h2>
              <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{lostLeads.length} lost leads</span>
            </div>
            <div className="space-y-2">
              {rows.map(([reason, count]) => (
                <div key={reason} className="flex items-center gap-3">
                  <div className="w-28 text-xs font-medium flex-shrink-0" style={{ color: "oklch(0.75 0.01 250)" }}>{reason}</div>
                  <div className="flex-1 relative h-5 rounded overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${Math.round((count / maxCount) * 100)}%`, background: reasonColors[reason] || "oklch(0.55 0.01 250)" }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>
                      {count} lead{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-xs w-10 text-right flex-shrink-0" style={{ color: "oklch(0.55 0.01 250)" }}>
                    {Math.round((count / lostLeads.length) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Drill-Down Drawer ──────────────────────────────────────── */}
      {drillDown && (() => {
        type PaymentRow = { date: string; clientName: string; caseType: string; caseNumber?: string; paymentType: string; amount: number; receivedFor: string; notes?: string; leadId?: string; };
        type LeadRow = { id: string; name: string; phone?: string; caseType: string; caseNumber?: string; stage: string; date: string; convertedDate?: string; retainerBooked: number; source?: string; notes?: string; };
        const isPaymentDrill = drillDown === "newClient" || drillDown === "existingClient" || drillDown === "totalReceived";
        const isLeadDrill = drillDown === "leads" || drillDown === "converted" || drillDown === "revBooked";
        const titleMap: Record<string, string> = {
          leads: "All Leads This Month",
          converted: "Converted Leads This Month",
          revBooked: "Revenue Booked — Converted Leads",
          newClient: "New Client Payments",
          existingClient: "Existing Client Payments",
          totalReceived: "All Payments This Month",
        };
        const payments: PaymentRow[] = isPaymentDrill
          ? (drillDown === "newClient" ? drillNewClient : drillDown === "existingClient" ? drillExisting : drillTotal)
          : [];
        const leads: LeadRow[] = isLeadDrill
          ? (drillDown === "leads" ? drillLeads : drillConverted)
          : [];
        const totalAmt = payments.reduce((s, p) => s + p.amount, 0);
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setDrillDown(null)}
            />
            {/* Drawer */}
            <div
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl flex flex-col shadow-2xl"
              style={{ background: "oklch(0.16 0.025 250)", borderLeft: "1px solid oklch(0.72 0.12 75 / 25%)" }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>
                <div>
                  <h2 className="text-base font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
                    {titleMap[drillDown]}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.01 250)" }}>
                    {MONTHS[selectedMonth - 1]} {selectedYear} · {isPaymentDrill ? `${payments.length} payments` : `${leads.length} leads`}
                    {isPaymentDrill && totalAmt > 0 && ` · Total: ${formatCurrency(totalAmt)}`}
                  </p>
                </div>
                <button
                  onClick={() => setDrillDown(null)}
                  className="p-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "oklch(0.55 0.01 250)" }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {isPaymentDrill && payments.length === 0 && (
                  <div className="text-center py-12 text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>No payments in this category for {MONTHS[selectedMonth - 1]}.</div>
                )}
                {isPaymentDrill && payments
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((p, i) => (
                  <div key={i} className="rounded-lg p-3 border" style={{ background: "oklch(0.19 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: "oklch(0.93 0.005 250)" }}>{p.clientName}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{p.caseType}</span>
                          {p.caseNumber && <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>#{p.caseNumber}</span>}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
                          {p.receivedFor} · {p.date}
                        </div>
                        {p.notes && <div className="text-xs mt-1 italic" style={{ color: "oklch(0.50 0.01 250)" }}>{p.notes}</div>}
                      </div>
                      <div className="text-base font-bold flex-shrink-0" style={{ color: "oklch(0.72 0.12 75)" }}>
                        {formatCurrency(p.amount)}
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: p.paymentType === "New Client" ? "oklch(0.55 0.18 145 / 12%)" : "oklch(0.60 0.15 250 / 12%)",
                        color: p.paymentType === "New Client" ? "oklch(0.65 0.18 145)" : "oklch(0.65 0.15 250)",
                        border: `1px solid ${p.paymentType === "New Client" ? "oklch(0.55 0.18 145 / 30%)" : "oklch(0.60 0.15 250 / 30%)"}`,
                      }}>
                        {p.paymentType}
                      </span>
                    </div>
                  </div>
                ))}
                {isLeadDrill && leads.length === 0 && (
                  <div className="text-center py-12 text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>No leads in this category for {MONTHS[selectedMonth - 1]}.</div>
                )}
                {isLeadDrill && leads
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((l, i) => {
                    const totalRcvd = payments.filter(p => p.leadId === l.id).reduce((s, p) => s + p.amount, 0);
                    const outstanding = l.retainerBooked > 0 ? l.retainerBooked - totalRcvd : 0;
                    return (
                      <div key={i} className="rounded-lg p-3 border" style={{ background: "oklch(0.19 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm" style={{ color: "oklch(0.93 0.005 250)" }}>{l.name}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{l.caseType}</span>
                              {l.caseNumber && <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>#{l.caseNumber}</span>}
                            </div>
                            {l.phone && (
                              <a href={`tel:${l.phone}`} className="flex items-center gap-1 text-xs mt-1 hover:underline" style={{ color: "oklch(0.65 0.01 250)" }}>
                                <Phone className="w-3 h-3" />{l.phone}
                              </a>
                            )}
                            <div className="text-xs mt-1" style={{ color: "oklch(0.50 0.01 250)" }}>
                              {l.source && `Source: ${l.source} · `}
                              {l.convertedDate ? `Converted: ${l.convertedDate}` : `Added: ${l.date}`}
                            </div>
                            {l.notes && (
                              <div className="text-xs mt-1.5 p-2 rounded" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.60 0.01 250)" }}>
                                <FileText className="w-3 h-3 inline mr-1" />{l.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                              background: l.stage === "Retained" ? "oklch(0.55 0.18 145 / 12%)" : l.stage === "Lost" ? "oklch(0.60 0.22 25 / 12%)" : "oklch(0.60 0.15 250 / 12%)",
                              color: l.stage === "Retained" ? "oklch(0.65 0.18 145)" : l.stage === "Lost" ? "oklch(0.70 0.22 25)" : "oklch(0.65 0.15 250)",
                            }}>{l.stage}</span>
                          </div>
                        </div>
                        {l.retainerBooked > 0 && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                            <div className="flex justify-between text-xs mb-1" style={{ color: "oklch(0.50 0.01 250)" }}>
                              <span>Booked: {formatCurrency(l.retainerBooked)}</span>
                              <span>Rcvd: {formatCurrency(totalRcvd)}</span>
                              <span style={{ color: outstanding <= 0 ? "oklch(0.65 0.18 145)" : "oklch(0.70 0.22 25)" }}>
                                {outstanding <= 0 ? "PAID IN FULL ✓" : `Due: ${formatCurrency(outstanding)}`}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
                              <div className="h-full rounded-full" style={{
                                width: `${Math.min(100, l.retainerBooked > 0 ? (totalRcvd / l.retainerBooked) * 100 : 0)}%`,
                                background: outstanding <= 0 ? "oklch(0.55 0.18 145)" : "oklch(0.72 0.12 75)",
                              }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </>
        );
      })()}
      {/* ── Quick Actions ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/leads", label: "Add Lead", icon: Users },
          { href: "/payments", label: "Log Payment", icon: DollarSign },
          { href: "/clients", label: "Client Ledger", icon: BookOpen },
          { href: "/close-day", label: "Close Day", icon: CalendarCheck },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <div className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:border-yellow-500/40 hover:bg-yellow-500/5"
              style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
              <Icon className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
              <span className="text-sm font-medium" style={{ color: "oklch(0.80 0.005 250)" }}>{label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>

    {/* Lead Detail Panel — opened from overdue installment alert */}
    {panelLeadId && (
      <LeadDetailPanel
        leadId={panelLeadId}
        initialTab={panelInitialTab}
        onClose={() => setPanelLeadId(null)}
      />
    )}
    </>  
  );
}

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, gold, statusColor, statusBg, statusBorder, statusLabel, onClick
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  gold?: boolean;
  statusColor?: string;
  statusBg?: string;
  statusBorder?: string;
  statusLabel?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`stat-card flex flex-col gap-2 transition-all${onClick ? " cursor-pointer hover:ring-1 hover:ring-yellow-500/40 hover:scale-[1.02]" : ""}`}
      style={statusBg ? { background: statusBg, borderColor: statusBorder } : {}}
      onClick={onClick}
      title={onClick ? "Click to view details" : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(0.55 0.01 250)" }}>{label}</span>
        <span style={{ color: gold ? "oklch(0.72 0.12 75)" : statusColor || "oklch(0.55 0.01 250)" }}>{icon}</span>
      </div>
      <div className="text-xl font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif", color: gold ? "oklch(0.72 0.12 75)" : statusColor || "oklch(0.93 0.005 250)" }}>
        {value}
      </div>
      {sub && <div className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>{sub}</div>}
      {statusLabel && <div className="text-xs font-semibold" style={{ color: statusColor }}>{statusLabel}</div>}
    </div>
  );
}
