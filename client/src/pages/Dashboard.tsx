/* ============================================================
   Graham Immigration Law, PC — Dashboard Page
   Design: Dark Luxury Legal — Navy + Gold
   Features: 7 stat cards, targets tracker, weekly bar chart
   ============================================================ */

import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useCRM } from "@/contexts/CRMContext";
import { trpc } from "@/lib/trpc";
import { todayPST, addDaysPST, formatDate as fmtDate } from "@/lib/timezone";
import { PSTDatePicker } from "@/components/PSTDatePicker";
import {
  formatCurrency,
  getWeeksInMonth,
  getTargetStatus,
  type Lead, type Payment, type CaseType, type PaymentType, type LeadStage,
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
  ChevronDown,
  ChevronUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import LeadDetailPanel from "@/components/LeadDetailPanel";
import StaleLeadsDrawer from "@/components/StaleLeadsDrawer";
import ClientPicker from "@/components/ClientPicker";
import LeadSourceField from "@/components/LeadSourceField";
import { getChangedClientFields } from "@/lib/clientRecord";
import { LEAD_SOURCE_OPTIONS, canonicalizeLeadSource } from "@/lib/leadSources";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { isConvertedStage, isActiveLeadStage } from "@shared/const";
import { getMonthlyLeadCohort, getMonthlyPaymentCohort, getMonthlyLifecycleLeads, getMonthlyRevenue } from "@/lib/dashboardMetrics";


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
  const { leads, payments, dayCloses, targets, addLead, updateLead, addPayment } = useCRM();
  const now = new Date();
  const nowPSTStr = now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); // YYYY-MM-DD
  const [selectedYear, setSelectedYear] = useState(parseInt(nowPSTStr.split("-")[0]));
  const [selectedMonth, setSelectedMonth] = useState(parseInt(nowPSTStr.split("-")[1]));
  const [panelLeadId, setPanelLeadId] = useState<string | null>(null);
  const [panelInitialTab, setPanelInitialTab] = useState<"followups" | "notes" | "info" | "installments">("installments");
  const [expandedSourceOutcome, setExpandedSourceOutcome] = useState<string | null>(null);
  // Drill-down drawer
  type DrillKey = "leads" | "converted" | "revBooked" | "newClient" | "existingClient" | "totalReceived" | null;
  const [drillDown, setDrillDown] = useState<DrillKey>(null); // current month
  const [staleDrawerOpen, setStaleDrawerOpen] = useState(false);

  const monthLeads = useMemo(() => getMonthlyLeadCohort(leads, selectedYear, selectedMonth), [leads, selectedYear, selectedMonth]);
  const monthPayments = useMemo(() => getMonthlyPaymentCohort(payments, selectedYear, selectedMonth), [payments, selectedYear, selectedMonth]);
  const monthlyLifecycle = useMemo(() => getMonthlyLifecycleLeads(leads, selectedYear, selectedMonth), [leads, selectedYear, selectedMonth]);
  const monthlyRevenue = useMemo(() => getMonthlyRevenue(monthPayments), [monthPayments]);

  // Stats
  const totalLeads = monthLeads.length;
  // Converted: leads that were converted in this month (by convertedDate or date).
  // Both Retained AND Onboarding are converted clients — include both.
  const converted = monthlyLifecycle.converted.length;
  const convRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  // Revenue Booked: sum retainerBooked for leads converted in the selected month.
  // Both Retained AND Onboarding are converted clients — include both.
  const revenueBooked = monthlyLifecycle.converted.reduce((sum, lead) => sum + Number(lead.retainerBooked || 0), 0);
  const newClientRev = monthlyRevenue.newClient;
  const existingClientRev = monthlyRevenue.existingClient;
  const consultationFeeRevenue = monthlyRevenue.consultation;
  const totalReceived = monthlyRevenue.total;
  const pctOfBooked = revenueBooked > 0 ? Math.round((totalReceived / revenueBooked) * 100) : 0;

  // ── All-time pipeline bifurcation (for the lead status overview card) ──
  // Active = not converted, not lost. Converted = Retained + Onboarding. Lost = Lost.
  const allTimeActive = useMemo(() => leads.filter(l => isActiveLeadStage(l.stage)).length, [leads]);
  const allTimeConverted = useMemo(() => leads.filter(l => isConvertedStage(l.stage)).length, [leads]);
  const allTimeLost = useMemo(() => leads.filter(l => l.stage === "Lost").length, [leads]);
  const allTimeTotal = allTimeActive + allTimeConverted + allTimeLost;
  const allTimeConvRate = allTimeTotal > 0 ? Math.round((allTimeConverted / allTimeTotal) * 100) : 0;

  // ── Monthly pipeline bifurcation (for the lead status overview card — month view) ──
  // Leads added this month = monthLeads (already computed above)
  // Converted this month = leads whose convertedDate (or date) falls in selected month AND are converted stage
  const monthConverted = monthlyLifecycle.converted.length;
  // Lost this month = leads whose lostDate (or date) falls in selected month AND stage is Lost
  const monthLost = monthlyLifecycle.lost.length;
  const monthConsultationsBooked = useMemo(
    () => new Set(monthPayments.filter(payment => payment.leadId && payment.receivedFor.trim().toLowerCase().includes("consultation")).map(payment => payment.leadId)).size,
    [monthPayments]
  );
  const monthConsultationsConverted = useMemo(() => leads.filter(lead => {
    if (!isConvertedStage(lead.stage) || !lead.consultationBookedDate) return false;
    const d = new Date((lead.convertedDate || lead.date) + "T12:00:00");
    return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
  }).length, [leads, selectedYear, selectedMonth]);
  const monthLeadsIn = monthLeads.length;
  const monthConvRate = monthLeadsIn > 0 ? Math.round((monthConverted / monthLeadsIn) * 100) : 0;

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
    const map: Record<string, { revenue: number; count: number; newRevenue: number; existingRevenue: number }> = {};
    monthPayments.forEach(p => {
      const ct = p.caseType || "Unknown";
      if (!map[ct]) map[ct] = { revenue: 0, count: 0, newRevenue: 0, existingRevenue: 0 };
      const amount = Number(p.amount || 0);
      map[ct].revenue += amount;
      map[ct].count += 1;
      if (p.paymentType === "New Client") map[ct].newRevenue += amount;
      if (p.paymentType === "Existing Client") map[ct].existingRevenue += amount;
    });
    return Object.entries(map)
      .map(([caseType, data]) => ({ caseType, ...data, pct: totalReceived > 0 ? Math.round((data.revenue / totalReceived) * 100) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [monthPayments, totalReceived]);

  // Revenue Velocity: cumulative actual vs. ideal pace
  const velocityData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthlyTarget = targets.monthly.green;
    const dailyIdeal = monthlyTarget / daysInMonth;
    const todayDay = selectedYear === parseInt(nowPSTStr.split("-")[0]) && selectedMonth === parseInt(nowPSTStr.split("-")[1])
      ? parseInt(nowPSTStr.split("-")[2])
      : daysInMonth; // for past months show full month
    const result: { day: number; label: string; actual: number | null; ideal: number }[] = [];
    let cumulative = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cumulative += dailyMap[dateStr]?.total ?? 0;
      const label = `${MONTHS[selectedMonth - 1].slice(0, 3)} ${d}`;
      result.push({
        day: d,
        label,
        actual: d <= todayDay ? cumulative : null,
        ideal: Math.round(dailyIdeal * d),
      });
    }
    return result;
  }, [dailyMap, selectedYear, selectedMonth, targets, nowPSTStr]);

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
      if (!isConvertedStage(l.stage)) return false;
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

  // Dynamic pipeline stages from DB
  const { data: pipelineStages } = trpc.pipeline.getStages.useQuery();

  // ── Inline modal state ──────────────────────────────────
  const LEAD_STAGES: LeadStage[] = (pipelineStages ?? []).map(s => s.name as LeadStage);
  const CASE_TYPES: CaseType[] = ["DA", "SIJS", "AOS", "AO", "K1/K2", "U-Visa", "Green Card", "BIA", "Other"];
  const emptyLeadForm: Omit<Lead, "id"> = {
    name: "", phone: "", email: "", alienNumber: "", dateOfBirth: "", address: "", preferredLanguage: "", caseType: "DA", caseNumber: "", source: "",
    stage: "New Lead", notes: "", date: todayPST(),
    retainerBooked: 0, downpayment: 0, quotedAmount: 0, referredBy: "", consultationFee: 0,
  };
  const emptyPaymentForm: Omit<Payment, "id"> = {
    date: todayPST(), clientName: "", leadId: undefined,
    caseType: "DA", caseNumber: "", paymentType: "New Client",
    amount: 0, receivedFor: "", notes: "",
  };
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadForm, setLeadForm] = useState<Omit<Lead, "id">>(emptyLeadForm);
  const [leadCustomSource, setLeadCustomSource] = useState("");
  const [selectedLeadClientId, setSelectedLeadClientId] = useState<string | null>(null);
  const [showLogPayment, setShowLogPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<Omit<Payment, "id">>(emptyPaymentForm);
  const [paymentClientSearch, setPaymentClientSearch] = useState("");
  const [selectedPaymentClientId, setSelectedPaymentClientId] = useState<string | null>(null);

  const handleAddLead = useCallback(async () => {
    if (!leadForm.name.trim()) { toast.error("Name is required"); return; }
    const sourceForSave = leadForm.source === "Other" ? leadCustomSource.trim() || "Other" : leadForm.source;
    if (selectedLeadClientId) {
      const selected = leads.find(lead => lead.id === selectedLeadClientId);
      if (selected) {
        const changed = getChangedClientFields(selected, leadForm).length > 0;
        if (changed) {
          const updateMaster = window.confirm(`This person already exists as ${selected.name}. Press OK to update the existing client record. Press Cancel to keep the existing record unchanged and avoid a duplicate lead.`);
          if (!updateMaster) return;
          await updateLead(selected.id, {
            name: leadForm.name,
            phone: leadForm.phone,
            email: leadForm.email,
            alienNumber: leadForm.alienNumber,
            dateOfBirth: leadForm.dateOfBirth,
            address: leadForm.address,
            preferredLanguage: leadForm.preferredLanguage,
            caseType: leadForm.caseType,
            caseNumber: leadForm.caseNumber,
            source: sourceForSave,
            referredBy: leadForm.referredBy,
            actorName: "Dashboard",
          });
          toast.success("Existing client updated; no duplicate lead created.");
        } else toast.info("Existing client selected; no duplicate lead created.");
        setSelectedLeadClientId(null);
        setShowAddLead(false);
        setLeadForm(emptyLeadForm);
        setLeadCustomSource("");
        return;
      }
    }
    await addLead({ ...leadForm, source: sourceForSave });
    toast.success("Lead added");
    setShowAddLead(false);
    setLeadForm(emptyLeadForm);
    setLeadCustomSource("");
  }, [leadForm, leadCustomSource, addLead, updateLead, leads, selectedLeadClientId]);

  const handleLogPayment = useCallback(async () => {
    if (!paymentForm.clientName.trim()) { toast.error("Client name is required"); return; }
    if (paymentForm.amount <= 0) { toast.error("Amount must be greater than 0"); return; }
    if (!paymentForm.receivedFor.trim()) { toast.error("Please specify what the payment is for"); return; }
    if (selectedPaymentClientId) {
      const selected = leads.find(lead => lead.id === selectedPaymentClientId);
      if (selected && getChangedClientFields(selected, { name: paymentForm.clientName, caseType: paymentForm.caseType, caseNumber: paymentForm.caseNumber }, ["name", "caseType", "caseNumber"]).length > 0) {
        const updateMaster = window.confirm(`You edited fields from ${selected.name}. Press OK to update the master client record. Press Cancel to keep the edited values only on this payment.`);
        if (updateMaster) await updateLead(selected.id, { name: paymentForm.clientName, caseType: paymentForm.caseType, caseNumber: paymentForm.caseNumber, actorName: "Dashboard" });
      }
    }
    await addPayment(paymentForm);
    toast.success("Payment logged and saved");
    setShowLogPayment(false);
    setPaymentForm(emptyPaymentForm);
    setPaymentClientSearch("");
    setSelectedPaymentClientId(null);
  }, [paymentForm, addPayment, updateLead, leads, selectedPaymentClientId]);

  const linkPaymentClient = useCallback((lead: Lead) => {
    setSelectedPaymentClientId(lead.id);
    setPaymentForm(f => ({ ...f, clientName: lead.name, leadId: lead.id, caseType: lead.caseType, caseNumber: lead.caseNumber, paymentType: isConvertedStage(lead.stage) ? "Existing Client" : "New Client" }));
    setPaymentClientSearch(lead.name);
  }, []);

  // ── Day Navigator state ──────────────────────────────────
  const [dayNavDate, setDayNavDate] = useState<string>(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
  );
  const shiftDayNav = (delta: number) => {
    setDayNavDate(prev => {
      const d = new Date(prev + "T12:00:00");
      d.setDate(d.getDate() + delta);
      return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    });
  };
  const isToday = dayNavDate === new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

  // Today's stats (always today's date for other uses)
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

  // Follow-up queue counts — must match the Follow-Ups page logic
  const leadsWithFollowUp = useMemo(
    () => leads.filter(l => l.followUpDate && isActiveLeadStage(l.stage)),
    [leads]
  );
  const overdueFollowUps = useMemo(() => leadsWithFollowUp.filter(l => l.followUpDate! < todayStr), [leadsWithFollowUp, todayStr]);
  const dueTodayFollowUps = useMemo(() => leadsWithFollowUp.filter(l => l.followUpDate === todayStr), [leadsWithFollowUp, todayStr]);
  // todayPayments kept for stale-lead checks; individual breakdowns computed in Day Navigator

  // Stale leads are active intake records with neither a scheduled follow-up nor
  // a linked payment in the prior 14 PST calendar days.
  const staleLeads = useMemo(() => {
    const cutoffDate = addDaysPST(todayStr, -14);
    return leads.filter(l => {
      if (!isActiveLeadStage(l.stage)) return false;
      const hasRecentScheduledFollowUp = Boolean(l.followUpDate && l.followUpDate >= cutoffDate);
      const hasRecentLinkedPayment = payments.some(p => p.leadId === l.id && p.date >= cutoffDate);
      return !hasRecentScheduledFollowUp && !hasRecentLinkedPayment;
    }).length;
  }, [leads, payments, todayStr]);


  // Drill-down data
  const drillLeads = useMemo(() => monthLeads, [monthLeads]);
  const drillConverted = useMemo(() => leads.filter(l => {
    // Both Retained AND Onboarding are converted clients
    if (!isConvertedStage(l.stage)) return false;
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
      [`Exported: ${new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "long", day: "numeric", year: "numeric" })}`],
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
            Leads · Payments · Revenue
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
            {MONTHS[selectedMonth - 1]} {selectedYear} · Graham Immigration Law, PC
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

      {/* ── Quick Actions ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Add Lead — opens inline modal */}
        <button
          onClick={() => { setSelectedLeadClientId(null); setLeadCustomSource(""); setLeadForm(emptyLeadForm); setShowAddLead(true); }}
          className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] text-left w-full"
          style={{ background: "oklch(0.20 0.030 250)", borderColor: "oklch(0.72 0.12 75 / 25%)", boxShadow: "0 1px 8px oklch(0 0 0 / 20%)" }}
        >
          <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.72 0.12 75 / 12%)" }}>
            <Users className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>Add Lead</div>
            <div className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>New intake</div>
          </div>
        </button>
        {/* Log Payment — opens inline modal */}
        <button
          onClick={() => { setSelectedPaymentClientId(null); setPaymentForm(emptyPaymentForm); setPaymentClientSearch(""); setShowLogPayment(true); }}
          className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] text-left w-full"
          style={{ background: "oklch(0.20 0.030 250)", borderColor: "oklch(0.72 0.12 75 / 25%)", boxShadow: "0 1px 8px oklch(0 0 0 / 20%)" }}
        >
          <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.72 0.12 75 / 12%)" }}>
            <DollarSign className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>Log Payment</div>
            <div className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>Record received</div>
          </div>
        </button>
        {/* Client Ledger — navigates */}
        <Link href="/clients">
          <div
            className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "oklch(0.20 0.030 250)", borderColor: "oklch(0.72 0.12 75 / 25%)", boxShadow: "0 1px 8px oklch(0 0 0 / 20%)" }}
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.72 0.12 75 / 12%)" }}>
              <BookOpen className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>Client Ledger</div>
              <div className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>View accounts</div>
            </div>
          </div>
        </Link>
        {/* Close Day — navigates */}
        <Link href="/close-day">
          <div
            className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "oklch(0.20 0.030 250)", borderColor: "oklch(0.72 0.12 75 / 25%)", boxShadow: "0 1px 8px oklch(0 0 0 / 20%)" }}
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.72 0.12 75 / 12%)" }}>
              <CalendarCheck className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>Close Day</div>
              <div className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>End of day register</div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Day Navigator ─────────────────────────────────── */}
      {(() => {
        const navPayments = payments.filter(p => p.date === dayNavDate);
        const navLeads = leads.filter(l => l.date === dayNavDate);
        const navFollowUps = leads.filter(l => l.followUpDate === dayNavDate && isActiveLeadStage(l.stage));
        const navNew = navPayments.filter(p => p.paymentType === "New Client").reduce((s, p) => s + p.amount, 0);
        const navExisting = navPayments.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + p.amount, 0);
        const navTotal = navNew + navExisting;
        // Both Retained AND Onboarding are converted clients
        const navConverted = leads.filter(l =>
          isConvertedStage(l.stage) && (l.convertedDate === dayNavDate || (!l.convertedDate && l.date === dayNavDate))
        ).length;
        const navDayLabel = new Date(dayNavDate + "T12:00:00").toLocaleDateString("en-US", {
          timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric", year: "numeric"
        });
        const isClosed = dayCloses.some((d: any) => d.date === dayNavDate);
        return (
          <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 30%)" }}>
            {/* Header row with navigation */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>
                  {isToday ? "Today" : "Day View"}
                </span>
                <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>{navDayLabel}</span>
                {isClosed && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 30%)" }}>
                    Day Closed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => shiftDayNav(-1)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/8"
                  style={{ color: "oklch(0.55 0.01 250)" }}
                  title="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {!isToday && (
                  <button
                    onClick={() => setDayNavDate(new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }))}
                    className="text-xs px-2.5 py-1 rounded-lg transition-colors hover:bg-white/8"
                    style={{ color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={() => shiftDayNav(1)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/8"
                  style={{ color: isToday ? "oklch(0.30 0.01 250)" : "oklch(0.55 0.01 250)", cursor: isToday ? "not-allowed" : "pointer" }}
                  disabled={isToday}
                  title="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px" style={{ background: "oklch(1 0 0 / 6%)" }}>
              {[
                { label: "Leads In", value: navLeads.length, highlight: false },
                { label: "Converted", value: navConverted, highlight: false },
                { label: "New Client $", value: formatCurrency(navNew), highlight: false },
                { label: "Existing Client $", value: formatCurrency(navExisting), highlight: false },
                { label: "Total Revenue", value: formatCurrency(navTotal), highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="text-center py-4 px-3" style={{ background: "oklch(0.18 0.025 250)" }}>
                  <div className="text-xs mb-1" style={{ color: "oklch(0.50 0.01 250)" }}>{label}</div>
                  <div className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: highlight ? "oklch(0.72 0.12 75)" : "oklch(0.93 0.005 250)" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Payments list for the day */}
            {navPayments.length > 0 && (
              <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.55 0.01 250)" }}>
                  Payments — {navPayments.length} record{navPayments.length !== 1 ? "s" : ""}
                </div>
                <div className="space-y-2">
                  {navPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg" style={{ background: "oklch(0.22 0.025 250)" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0" style={{
                          background: p.paymentType === "New Client" ? "oklch(0.55 0.18 145 / 15%)" : "oklch(0.65 0.15 250 / 15%)",
                          color: p.paymentType === "New Client" ? "oklch(0.65 0.18 145)" : "oklch(0.70 0.12 250)",
                        }}>
                          {p.paymentType === "New Client" ? "New" : "Existing"}
                        </span>
                        <span className="text-sm font-medium truncate" style={{ color: "oklch(0.93 0.005 250)" }}>{p.clientName}</span>
                        {p.caseType && <span className="text-xs flex-shrink-0" style={{ color: "oklch(0.50 0.01 250)" }}>{p.caseType}</span>}
                        {p.receivedFor && <span className="text-xs truncate hidden sm:block" style={{ color: "oklch(0.45 0.01 250)" }}>{p.receivedFor}</span>}
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leads added that day */}
            {navLeads.length > 0 && (
              <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.55 0.01 250)" }}>
                  Leads Added — {navLeads.length}
                </div>
                <div className="flex flex-wrap gap-2">
                  {navLeads.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setPanelLeadId(l.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                      style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.93 0.005 250)", border: "1px solid oklch(1 0 0 / 8%)" }}
                    >
                      <span className="font-medium">{l.name}</span>
                      <span style={{ color: "oklch(0.50 0.01 250)" }}>{l.caseType}</span>
                      <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)" }}>{l.stage}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-ups due that day */}
            {navFollowUps.length > 0 && (
              <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.55 0.01 250)" }}>
                  Follow-Ups Due — {navFollowUps.length}
                </div>
                <div className="flex flex-wrap gap-2">
                  {navFollowUps.map(lead => (
                    <div key={lead.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.80 0.01 250)" }}>
                      <span className="font-medium" style={{ color: "oklch(0.93 0.005 250)" }}>{lead.name}</span>
                      <span style={{ color: "oklch(0.50 0.01 250)" }}>·</span>
                      <span>{lead.caseType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {navPayments.length === 0 && navLeads.length === 0 && navFollowUps.length === 0 && (
              <div className="px-5 py-6 text-center border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                <p className="text-sm" style={{ color: "oklch(0.40 0.01 250)" }}>No activity recorded for this day.</p>
              </div>
            )}
          </div>
        );
      })()}

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
                    {item.dueDate === todayStr ? "TODAY" : fmtDate(item.dueDate)}
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
                  <span style={{ color: "oklch(0.55 0.01 250)" }}>due {fmtDate(item.dueDate)}</span>
                </div>
              ))}
              {overdueInstallments.length > 4 && (
                <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>+{overdueInstallments.length - 4} more</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkRescheduleMut.mutate({ newDate: todayPST() })}
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

      {/* -- Follow-Up Queue Strip */}
      {(() => {
        if (dueTodayFollowUps.length === 0 && overdueFollowUps.length === 0) return null;
        return (
          <div className="rounded-lg p-4 border flex items-start gap-4 flex-wrap" style={{ background: "oklch(0.70 0.22 25 / 8%)", borderColor: "oklch(0.70 0.22 25 / 35%)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Follow-Ups In Progress</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap flex-1">
              {overdueFollowUps.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" style={{ color: "oklch(0.70 0.22 25)" }} />
                  <span className="text-sm font-semibold" style={{ color: "oklch(0.70 0.22 25)" }}>{overdueFollowUps.length} overdue in queue</span>
                  <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                    {overdueFollowUps.slice(0, 2).map(lead => lead.name).join(", ")}{overdueFollowUps.length > 2 ? ` +${overdueFollowUps.length - 2} more` : ""}
                  </span>
                </div>
              )}
              {dueTodayFollowUps.length > 0 && (
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.12 75)" }} />
                  <span className="text-sm font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>{dueTodayFollowUps.length} due today</span>
                  <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
                    {dueTodayFollowUps.slice(0, 2).map(lead => lead.name).join(", ")}{dueTodayFollowUps.length > 2 ? ` +${dueTodayFollowUps.length - 2} more` : ""}
                  </span>
                </div>
              )}
            </div>
            <Link href="/follow-ups">
              <span className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-90 cursor-pointer"
                style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 35%)" }}>
                Open Follow-Ups
              </span>
            </Link>
          </div>
        );
      })()}

      {/* ── Lead Status Overview (Active / Converted / Lost) ─────────── */}
      <div className="rounded-lg border overflow-hidden" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 30%)" }}>
        {/* Header with month navigator */}
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Lead Status Overview</span>
          </div>
          {/* Month navigator — synced with the main dashboard month selector */}
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-white/5 transition-colors" style={{ color: "oklch(0.55 0.01 250)" }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold px-1" style={{ color: "oklch(0.75 0.01 250)", minWidth: 90, textAlign: "center" }}>
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-white/5 transition-colors" style={{ color: "oklch(0.55 0.01 250)" }}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Monthly stats — primary row */}
        <div className="grid grid-cols-3">
          {/* Leads In this month */}
          <div className="px-5 py-4 flex flex-col gap-1" style={{ borderRight: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "oklch(0.65 0.15 250)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.65 0.15 250)" }}>Leads In</span>
            </div>
            <div className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>{monthLeadsIn}</div>
            <div className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>New leads added this month</div>
            <div className="text-xs mt-1 font-medium" style={{ color: "oklch(0.55 0.01 250)" }}>
              All-time active: <span style={{ color: "oklch(0.65 0.15 250)" }}>{allTimeActive}</span>
            </div>
          </div>
          {/* Converted this month */}
          <div className="px-5 py-4 flex flex-col gap-1" style={{ borderRight: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "oklch(0.55 0.18 145)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.18 145)" }}>Converted</span>
            </div>
            <div className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>{monthConverted}</div>
            <div className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>
              {monthConvRate}% of leads in · signed retainer
            </div>
            <div className="text-xs mt-1 font-medium" style={{ color: "oklch(0.55 0.01 250)" }}>
              All-time converted: <span style={{ color: "oklch(0.55 0.18 145)" }}>{allTimeConverted}</span> ({allTimeConvRate}%)
            </div>
          </div>
          {/* Lost this month */}
          <div className="px-5 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "oklch(0.65 0.18 25)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.65 0.18 25)" }}>Lost</span>
            </div>
            <div className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>{monthLost}</div>
            <div className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>Marked as lost this month</div>
            <div className="text-xs mt-1 font-medium" style={{ color: "oklch(0.55 0.01 250)" }}>
              All-time lost: <span style={{ color: "oklch(0.65 0.18 25)" }}>{allTimeLost}</span>
            </div>
          </div>
        </div>

        {/* All-time progress bar */}
        <div className="px-5 pb-4">
          <div className="text-xs mb-1.5" style={{ color: "oklch(0.45 0.01 250)" }}>All-time pipeline ({allTimeTotal} total)</div>
          <div className="flex rounded-full overflow-hidden h-2">
            <div style={{ width: `${allTimeTotal > 0 ? (allTimeActive / allTimeTotal) * 100 : 0}%`, background: "oklch(0.65 0.15 250)" }} />
            <div style={{ width: `${allTimeTotal > 0 ? (allTimeConverted / allTimeTotal) * 100 : 0}%`, background: "oklch(0.55 0.18 145)" }} />
            <div style={{ width: `${allTimeTotal > 0 ? (allTimeLost / allTimeTotal) * 100 : 0}%`, background: "oklch(0.65 0.18 25)" }} />
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs" style={{ color: "oklch(0.65 0.15 250)" }}>■ Active ({allTimeActive})</span>
            <span className="text-xs" style={{ color: "oklch(0.55 0.18 145)" }}>■ Converted ({allTimeConverted})</span>
            <span className="text-xs" style={{ color: "oklch(0.65 0.18 25)" }}>■ Lost ({allTimeLost})</span>
          </div>
        </div>
      </div>

            {/* ── 7 Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Leads In" value={totalLeads} sub="this month" onClick={() => setDrillDown("leads")} />
        <StatCard icon={<CalendarCheck className="w-4 h-4" />} label="Consultations" value={monthConsultationsBooked} sub="fee paid & booked" />
        <StatCard icon={<UserCheck className="w-4 h-4" />} label="Consults → Won" value={monthConsultationsConverted} sub="booked consultations converted" />
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="Consult. Fees" value={formatCurrency(consultationFeeRevenue)} sub="included in new revenue" />
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
          onClick={() => setStaleDrawerOpen(true)}
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
              {/* Red zone: 0 → yellow */}
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (targets.monthly.yellow / targets.monthly.green) * 100)}%`, background: "oklch(0.60 0.22 25 / 30%)" }} />
              {/* Yellow zone: yellow → green */}
              <div className="absolute inset-y-0 rounded-full" style={{ left: `${(targets.monthly.yellow / targets.monthly.green) * 100}%`, width: `${((targets.monthly.green - targets.monthly.yellow) / targets.monthly.green) * 100}%`, background: "oklch(0.72 0.15 80 / 30%)" }} />
              {/* Green zone: green → max */}
              <div className="absolute inset-y-0 rounded-full" style={{ left: `${Math.min(100, (targets.monthly.green / targets.monthly.green) * 100)}%`, right: 0, background: "oklch(0.55 0.18 145 / 30%)" }} />
              {/* Progress */}
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (totalReceived / targets.monthly.green) * 100)}%`, background: sc.text }} />
            </div>
            <div className="flex justify-between text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>
              <span>{formatCurrency(totalReceived)}</span>
              <span>Target: {formatCurrency(targets.monthly.green)}</span>
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
                <span>🟢 {formatCurrency(targets.weekly.green)}</span>
                <span>🟡 {formatCurrency(targets.weekly.yellow)}</span>
              </div>
            </div>
            <div className="space-y-2">
              {weeklyData.map((w, i) => {
                const wStatus = getTargetStatus(w.total, "weekly", targets);
                const wSc = statusColors[wStatus];
                const weekScale = targets.weekly.green * 1.3; // show a bit past green
                const pct = Math.min(100, (w.total / weekScale) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs w-14 flex-shrink-0" style={{ color: "oklch(0.55 0.01 250)" }}>{w.name}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden relative" style={{ background: "oklch(0.22 0.025 250)" }}>
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: wSc.text }} />
                      {/* Yellow tick */}
                      <div className="absolute inset-y-0 w-px" style={{ left: `${Math.min(98, (targets.weekly.yellow / weekScale) * 100)}%`, background: "oklch(0.72 0.15 80 / 60%)" }} />
                      {/* Green tick */}
                      <div className="absolute inset-y-0 w-px" style={{ left: `${Math.min(98, (targets.weekly.green / weekScale) * 100)}%`, background: "oklch(0.55 0.18 145 / 60%)" }} />
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
            <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: "oklch(0.55 0.18 145)" }} />{formatCurrency(targets.weekly.green)}</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: "oklch(0.72 0.15 80)" }} />{formatCurrency(targets.weekly.yellow)}</span>
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
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={velocityData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="velActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={4}
              angle={-35}
              textAnchor="end"
              height={40}
            />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)", borderRadius: "8px", color: "oklch(0.93 0.005 250)" }}
              formatter={(v: unknown, name: string) => { const num = typeof v === "number" ? v : null; return num !== null ? [formatCurrency(num), name === "actual" ? "Actual" : "Ideal Pace"] : ["—", name === "actual" ? "Actual" : "Ideal Pace"]; }}
              labelFormatter={(label: string) => label}
            />
            {/* Monthly target line */}
            <ReferenceLine y={targets.monthly.green} stroke="oklch(0.55 0.18 145)" strokeDasharray="6 3" strokeWidth={1.5}
              label={{ value: "Target", position: "insideTopRight", fill: "oklch(0.55 0.18 145)", fontSize: 10 }} />
            {/* Today vertical marker — only for current month */}
            {selectedYear === parseInt(nowPSTStr.split("-")[0]) && selectedMonth === parseInt(nowPSTStr.split("-")[1]) && (() => {
              const todayLabel = `${MONTHS[selectedMonth - 1].slice(0, 3)} ${parseInt(nowPSTStr.split("-")[2])}`;
              return (
                <ReferenceLine
                  x={todayLabel}
                  stroke="oklch(0.72 0.12 75 / 70%)"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  label={{ value: "Today", position: "insideTopLeft", fill: "oklch(0.72 0.12 75)", fontSize: 10 }}
                />
              );
            })()}
            <Area type="monotone" dataKey="ideal" stroke="oklch(0.55 0.18 145)" strokeWidth={1.5} strokeDasharray="6 3" fill="none" dot={false} />
            <Area type="monotone" dataKey="actual" stroke="oklch(0.72 0.12 75)" strokeWidth={2.5} fill="url(#velActual)" dot={false} connectNulls={false} />
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
                            {new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric" })}
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
                    <th className="text-right py-2 pr-4 font-semibold" style={{ color: "oklch(0.72 0.12 75)" }}>Total</th>
                    <th className="text-right py-2 pr-4 font-semibold" style={{ color: "oklch(0.55 0.18 145)" }}>New</th>
                    <th className="text-right py-2 pr-4 font-semibold" style={{ color: "oklch(0.65 0.15 250)" }}>Existing</th>
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
                      <td className="text-right py-2 pr-4" style={{ color: "oklch(0.65 0.18 145)" }}>{formatCurrency(row.newRevenue)}</td>
                      <td className="text-right py-2 pr-4" style={{ color: "oklch(0.65 0.15 250)" }}>{formatCurrency(row.existingRevenue)}</td>
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
                    <td className="text-right pt-2 pr-4" style={{ color: "oklch(0.65 0.18 145)" }}>{formatCurrency(newClientRev)}</td>
                    <td className="text-right pt-2 pr-4" style={{ color: "oklch(0.65 0.15 250)" }}>{formatCurrency(existingClientRev)}</td>
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
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Lead Source Funnel</h2>
            <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{MONTHS[selectedMonth - 1]} {selectedYear}</span>
          </div>
          {(() => {
            type SourceOutcome = "all" | "consulted" | "consultedWon" | "won" | "lost" | "open";
            type SourceRow = { leads: number; consultations: number; consultationsConverted: number; converted: number; lost: number; inProgress: number; revenue: number; newRevenue: number; existingRevenue: number; leadIds: Record<SourceOutcome, string[]> };
            const emptyLeadIds = (): Record<SourceOutcome, string[]> => ({ all: [], consulted: [], consultedWon: [], won: [], lost: [], open: [] });
            const sourceMap: Record<string, SourceRow> = {};
            monthLeads.forEach(l => {
              const src = canonicalizeLeadSource(l.source);
              if (!sourceMap[src]) sourceMap[src] = { leads: 0, consultations: 0, consultationsConverted: 0, converted: 0, lost: 0, inProgress: 0, revenue: 0, newRevenue: 0, existingRevenue: 0, leadIds: emptyLeadIds() };
              const row = sourceMap[src];
              const linkedPayments = monthPayments.filter(payment => payment.leadId === l.id);
              const consulted = Boolean(l.consultationBookedDate || linkedPayments.some(payment => payment.receivedFor.trim().toLowerCase().includes("consultation")));
              row.leads += 1;
              row.leadIds.all.push(l.id);
              row.newRevenue += linkedPayments.filter(payment => payment.paymentType === "New Client").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
              row.existingRevenue += linkedPayments.filter(payment => payment.paymentType === "Existing Client").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
              row.revenue = row.newRevenue + row.existingRevenue;
              if (consulted) { row.consultations += 1; row.leadIds.consulted.push(l.id); }
              if (isConvertedStage(l.stage)) {
                row.converted += 1;
                row.leadIds.won.push(l.id);
                if (consulted) { row.consultationsConverted += 1; row.leadIds.consultedWon.push(l.id); }
              } else if (l.stage === "Lost") {
                row.lost += 1;
                row.leadIds.lost.push(l.id);
              } else {
                row.inProgress += 1;
                row.leadIds.open.push(l.id);
              }
            });
            const rows = Object.entries(sourceMap)
              .map(([src, d]) => ({ src, ...d, convRate: d.leads > 0 ? Math.round((d.converted / d.leads) * 100) : 0 }))
              .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
            const linkedNewRevenue = rows.reduce((sum, row) => sum + row.newRevenue, 0);
            const linkedExistingRevenue = rows.reduce((sum, row) => sum + row.existingRevenue, 0);
            const unallocatedNewRevenue = Math.max(0, newClientRev - linkedNewRevenue);
            const unallocatedExistingRevenue = Math.max(0, existingClientRev - linkedExistingRevenue);
            if (rows.length === 0) return <p className="text-sm text-center py-6" style={{ color: "oklch(0.45 0.01 250)" }}>No lead source data for this month.</p>;
            return (
              <div>
                <p className="text-xs mb-2" style={{ color: "oklch(0.45 0.01 250)" }}>Selected-month lead cohort and its current lifecycle outcomes. Payment totals reconcile to all payments received in the selected month.</p>
                <div className="rounded px-3 py-2 mb-2 border" style={{ background: "oklch(0.72 0.12 75 / 8%)", borderColor: "oklch(0.72 0.12 75 / 22%)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                    <span style={{ color: "oklch(0.80 0.005 250)" }}>Funnel total: <strong style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(newClientRev + existingClientRev)}</strong></span>
                    <span style={{ color: "oklch(0.55 0.01 250)" }}>New {formatCurrency(newClientRev)} · Existing {formatCurrency(existingClientRev)}</span>
                  </div>
                  {(unallocatedNewRevenue > 0 || unallocatedExistingRevenue > 0) && <div className="text-[10px] mt-1" style={{ color: "oklch(0.70 0.18 45)" }}>Unallocated to this month’s lead cohort: New {formatCurrency(unallocatedNewRevenue)} · Existing {formatCurrency(unallocatedExistingRevenue)}. These payments remain included in the authoritative monthly total.</div>}
                </div>
                <div className="space-y-1.5">
                  {rows.map(row => (
                    <div key={row.src} className="rounded px-3 py-2" style={{ background: "oklch(0.20 0.025 250)" }}>
                      <div className="flex justify-between gap-3"><span className="text-xs font-medium truncate" style={{ color: "oklch(0.80 0.005 250)" }}>{row.src}</span><span className="text-xs font-semibold shrink-0" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(row.revenue)} received</span></div>
                      <div className="text-[10px] mt-0.5" style={{ color: "oklch(0.48 0.01 250)" }}>New {formatCurrency(row.newRevenue)} · Existing {formatCurrency(row.existingRevenue)}</div>
                      <div className="text-xs mt-1 flex flex-wrap gap-x-2 gap-y-1" style={{ color: "oklch(0.60 0.01 250)" }}>
                        {([
                          ["all", `Leads ${row.leads}`, "oklch(0.60 0.01 250)"],
                          ["consulted", `Consulted ${row.consultations}`, "oklch(0.72 0.12 75)"],
                          ["consultedWon", `Consulted → Won ${row.consultationsConverted}`, "oklch(0.55 0.18 145)"],
                          ["won", `Won ${row.converted} (${row.convRate}%)`, "oklch(0.55 0.18 145)"],
                          ["lost", `Lost ${row.lost}`, "oklch(0.70 0.22 25)"],
                          ["open", `In progress ${row.inProgress}`, "oklch(0.60 0.01 250)"],
                        ] as const).map(([outcome, label, color]) => {
                          const key = `${row.src}:${outcome}`;
                          return <button key={outcome} onClick={() => setExpandedSourceOutcome(expandedSourceOutcome === key ? null : key)} className="underline-offset-2 hover:underline" style={{ color }} aria-expanded={expandedSourceOutcome === key}>{label}</button>;
                        })}
                      </div>
                      {(["all", "consulted", "consultedWon", "won", "lost", "open"] as const).map(outcome => {
                        const key = `${row.src}:${outcome}`;
                        if (expandedSourceOutcome !== key) return null;
                        const outcomeLeads = row.leadIds[outcome].map(id => monthLeads.find(lead => lead.id === id)).filter((lead): lead is Lead => Boolean(lead));
                        return <div key={key} className="mt-2 rounded border-t pt-2 space-y-1" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                          {outcomeLeads.length === 0 ? <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>No matching leads.</span> : outcomeLeads.map(lead => <button key={lead.id} onClick={() => { setPanelLeadId(lead.id); setPanelInitialTab("info"); }} className="block w-full text-left text-xs hover:underline" style={{ color: "oklch(0.86 0.01 250)" }}>{lead.name} · {lead.caseType} · {lead.stage}</button>)}
                        </div>;
                      })}
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
            <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{MONTHS[selectedMonth - 1]} cohort</span>
          </div>
{(() => {
            // Active pipeline = all stages except Retained, Onboarding, and Lost.
            // Use dynamic stages from DB so new stages added via pipeline manager are included.
            const activePipelineStages = (pipelineStages ?? []).filter(
              s => !isConvertedStage(s.name) && s.name !== "Lost"
            );
            const activeStageName = activePipelineStages.map(s => s.name);
            const activeLeads = monthLeads.filter(l => activeStageName.includes(l.stage));
            const totalPipeline = activeLeads.reduce((s, l) => s + (l.quotedAmount || 0), 0);
            const stageBreakdown = activePipelineStages.map(s => {
              const stageLeads = activeLeads.filter(l => l.stage === s.name);
              const value = stageLeads.reduce((acc, l) => acc + (l.quotedAmount || 0), 0);
              return { stage: s.name, count: stageLeads.length, value };
            });
            // Cycle through a palette of colors for dynamic stages
            const palette = [
              "oklch(0.65 0.15 250)",
              "oklch(0.72 0.12 75)",
              "oklch(0.72 0.12 40)",
              "oklch(0.65 0.18 300)",
              "oklch(0.65 0.15 200)",
              "oklch(0.72 0.12 160)",
            ];
            return (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.72 0.12 75)" }}>
                    {formatCurrency(totalPipeline)}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>{activeLeads.length} active leads (excl. converted &amp; lost)</div>
                </div>
                <div className="space-y-2">
                  {stageBreakdown.map(({ stage, count, value }: { stage: string; count: number; value: number }, idx: number) => (
                    <div key={stage} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: palette[idx % palette.length] }}>{stage}</span>
                          <span className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>{count} leads</span>
                        </div>
                        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.025 250)" }}>
                          <div className="h-full rounded-full" style={{ width: totalPipeline > 0 ? `${Math.round((value / totalPipeline) * 100)}%` : "0%", background: palette[idx % palette.length] }} />
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
        const lostLeads = monthlyLifecycle.lost;
        if (lostLeads.length === 0) return null;
        const reasonMap: Record<string, number> = {};
        lostLeads.forEach(l => {
          const r = l.lostReason?.trim() || "Needs review";
          reasonMap[r] = (reasonMap[r] || 0) + 1;
        });
        const rows = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]);
        const maxCount = rows[0]?.[1] || 1;
        const needsReviewCount = reasonMap["Needs review"] ?? 0;
        const reasonColors: Record<string, string> = {
          "Price": "oklch(0.70 0.22 25)",
          "Competitor": "oklch(0.65 0.15 250)",
          "Not Qualified": "oklch(0.60 0.20 60)",
          "No Response": "oklch(0.55 0.01 250)",
          "Other": "oklch(0.50 0.01 250)",
          "Needs review": "oklch(0.70 0.22 25)",
        };
        return (
          <div className="rounded-lg p-5 border" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(1 0 0 / 8%)" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4" style={{ color: "oklch(0.70 0.22 25)" }} />
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.72 0.12 75)" }}>Lost Lead Reasons</h2>
              <span className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>{lostLeads.length} lost leads · {MONTHS[selectedMonth - 1]} {selectedYear}</span>
              {needsReviewCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.60 0.22 25 / 18%)", color: "oklch(0.78 0.22 25)" }}>{needsReviewCount} need review</span>}
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
                          {p.receivedFor} · {fmtDate(p.date)}
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
                              {l.convertedDate ? `Converted: ${fmtDate(l.convertedDate)}` : `Added: ${fmtDate(l.date)}`}
                            </div>
                            {l.notes && (
                              <div className="text-xs mt-1.5 p-2 rounded" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.60 0.01 250)" }}>
                                <FileText className="w-3 h-3 inline mr-1" />{l.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                              background: isConvertedStage(l.stage) ? "oklch(0.55 0.18 145 / 12%)" : l.stage === "Lost" ? "oklch(0.60 0.22 25 / 12%)" : "oklch(0.60 0.15 250 / 12%)",
                              color: isConvertedStage(l.stage) ? "oklch(0.65 0.18 145)" : l.stage === "Lost" ? "oklch(0.70 0.22 25)" : "oklch(0.65 0.15 250)",
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

    </div>

    {/* Lead Detail Panel — opened from overdue installment alert */}
    {panelLeadId && (
      <LeadDetailPanel
        leadId={panelLeadId}
        initialTab={panelInitialTab}
        onClose={() => setPanelLeadId(null)}
      />
    )}

    {/* Stale Leads Drawer */}
    <StaleLeadsDrawer open={staleDrawerOpen} onClose={() => setStaleDrawerOpen(false)} />

    {/* ── Add Lead Modal ───────────────────────────────── */}
    <Dialog open={showAddLead} onOpenChange={open => { setShowAddLead(open); if (!open) { setSelectedLeadClientId(null); setLeadCustomSource(""); setLeadForm(emptyLeadForm); } }}>
      <DialogContent style={{ background: "oklch(0.18 0.030 250)", borderColor: "oklch(1 0 0 / 12%)", maxWidth: "520px" }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>Add New Lead</DialogTitle>
          <DialogDescription className="sr-only">Search an existing person to auto-fill this lead form, or enter a new lead.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <ClientPicker
                label="Full Name *"
                value={leadForm.name}
                selectedLeadId={selectedLeadClientId}
                leads={leads}
                payments={payments}
                onValueChange={value => { setSelectedLeadClientId(null); setLeadForm(f => ({ ...f, name: value })); }}
                onSelect={lead => { setSelectedLeadClientId(lead.id); setLeadCustomSource(LEAD_SOURCE_OPTIONS.includes(lead.source as (typeof LEAD_SOURCE_OPTIONS)[number]) ? "" : lead.source); setLeadForm(f => ({ ...f, name: lead.name, phone: lead.phone, email: lead.email, alienNumber: lead.alienNumber ?? "", dateOfBirth: lead.dateOfBirth ?? "", address: lead.address ?? "", preferredLanguage: lead.preferredLanguage ?? "", caseType: lead.caseType, caseNumber: lead.caseNumber, source: lead.source, referredBy: lead.referredBy, notes: lead.notes })); }}
                placeholder="Search name, phone, A-number, or email"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Phone</Label>
              <Input value={leadForm.phone} onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Email</Label>
              <Input value={leadForm.email} onChange={e => setLeadForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>A-Number</Label>
              <Input value={leadForm.alienNumber ?? ""} onChange={e => setLeadForm(f => ({ ...f, alienNumber: e.target.value }))} placeholder="A# 215-XXX-XXX"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Date of Birth</Label>
              <Input type="date" value={leadForm.dateOfBirth ?? ""} onChange={e => setLeadForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Current Address</Label>
              <Input value={leadForm.address ?? ""} onChange={e => setLeadForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, city, state, ZIP"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Preferred Language</Label>
              <Input value={leadForm.preferredLanguage ?? ""} onChange={e => setLeadForm(f => ({ ...f, preferredLanguage: e.target.value }))} placeholder="English, Punjabi, Spanish"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Case Type</Label>
              <Select value={leadForm.caseType} onValueChange={v => setLeadForm(f => ({ ...f, caseType: v as CaseType }))}>
                <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                  {CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Stage</Label>
              <Select value={leadForm.stage} onValueChange={v => setLeadForm(f => ({ ...f, stage: v as LeadStage }))}>
                <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                  {LEAD_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <LeadSourceField
                value={leadForm.source}
                customValue={leadCustomSource}
                onChange={value => setLeadForm(f => ({ ...f, source: value }))}
                onCustomValueChange={setLeadCustomSource}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Quoted Amount ($)</Label>
              <Input type="number" value={leadForm.quotedAmount || ""} onChange={e => setLeadForm(f => ({ ...f, quotedAmount: parseFloat(e.target.value) || 0 }))} placeholder="0"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Date</Label>
              <PSTDatePicker value={leadForm.date} onChange={v => setLeadForm(f => ({ ...f, date: v }))} inline />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Notes</Label>
              <Textarea value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" rows={2}
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleAddLead} style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>Add Lead</Button>
          <Button variant="outline" onClick={() => setShowAddLead(false)} style={{ borderColor: "oklch(1 0 0 / 15%)", color: "oklch(0.65 0.01 250)" }}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* ── Log Payment Modal ─────────────────────────────── */}
    <Dialog open={showLogPayment} onOpenChange={open => { setShowLogPayment(open); if (!open) { setSelectedPaymentClientId(null); setPaymentForm(emptyPaymentForm); setPaymentClientSearch(""); } }}>
      <DialogContent style={{ background: "oklch(0.18 0.030 250)", borderColor: "oklch(1 0 0 / 12%)", maxWidth: "520px" }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>Log Payment</DialogTitle>
          <DialogDescription className="sr-only">Search an existing person to link this payment and view their history.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {/* New / Existing toggle */}
          <div className="flex gap-2">
            {(["New Client", "Existing Client"] as PaymentType[]).map(t => (
              <button key={t} onClick={() => setPaymentForm(f => ({ ...f, paymentType: t }))}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={paymentForm.paymentType === t
                  ? { background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }
                  : { background: "oklch(0.22 0.025 250)", color: "oklch(0.55 0.01 250)", border: "1px solid oklch(1 0 0 / 12%)" }
                }>{t}</button>
            ))}
          </div>
          <ClientPicker
            label="Client Name *"
            value={paymentClientSearch || paymentForm.clientName}
            selectedLeadId={selectedPaymentClientId}
            leads={leads}
            payments={payments}
            onValueChange={value => { setSelectedPaymentClientId(null); setPaymentClientSearch(value); setPaymentForm(f => ({ ...f, clientName: value, leadId: undefined })); }}
            onSelect={linkPaymentClient}
            onClear={() => { setSelectedPaymentClientId(null); setPaymentForm(f => ({ ...f, leadId: undefined, clientName: "" })); setPaymentClientSearch(""); }}
            placeholder="Search name, phone, A-number, or email"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Case Type</Label>
              <Select value={paymentForm.caseType} onValueChange={v => setPaymentForm(f => ({ ...f, caseType: v as CaseType }))}>
                <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                  {CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Case Number</Label>
              <Input value={paymentForm.caseNumber} onChange={e => setPaymentForm(f => ({ ...f, caseNumber: e.target.value }))} placeholder="e.g. 409"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Amount ($) *</Label>
              <Input type="number" value={paymentForm.amount || ""} onChange={e => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0"
                style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Date</Label>
              <PSTDatePicker value={paymentForm.date} onChange={v => setPaymentForm(f => ({ ...f, date: v }))} inline />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Received For *</Label>
            <Input value={paymentForm.receivedFor} onChange={e => setPaymentForm(f => ({ ...f, receivedFor: e.target.value }))} placeholder="e.g. Retainer downpayment, I-589 update"
              style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>Notes</Label>
            <Textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" rows={2}
              style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleLogPayment} style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.13 0.025 250)" }}>Log Payment</Button>
          <Button variant="outline" onClick={() => setShowLogPayment(false)} style={{ borderColor: "oklch(1 0 0 / 15%)", color: "oklch(0.65 0.01 250)" }}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
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
