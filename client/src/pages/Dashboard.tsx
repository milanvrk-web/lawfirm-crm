/* ============================================================
   Law Firm CRM — Dashboard Page
   Design: Dark Luxury Legal — Navy + Gold
   Features: 7 stat cards, targets tracker, weekly bar chart
   ============================================================ */

import { useState, useMemo } from "react";
import { useCRM } from "@/contexts/CRMContext";
import {
  formatCurrency,
  getMonthLeads,
  getMonthPayments,
  getWeeksInMonth,
  TARGETS,
  getTargetStatus,
} from "@/lib/store";
import {
  BarChart,
  Bar,
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
  Target,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
} from "lucide-react";
import { Link } from "wouter";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Dashboard() {
  const { data } = useCRM();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(4); // April

  const monthLeads = useMemo(() => getMonthLeads(data, selectedYear, selectedMonth), [data, selectedYear, selectedMonth]);
  const monthPayments = useMemo(() => getMonthPayments(data, selectedYear, selectedMonth), [data, selectedYear, selectedMonth]);

  // Stats
  const totalLeads = monthLeads.length;
  const converted = monthLeads.filter(l => l.stage === "Retained").length;
  const convRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  const revenueBooked = monthLeads.filter(l => l.stage === "Retained").reduce((s, l) => s + l.retainerBooked, 0);
  const newClientRev = monthPayments.filter(p => p.paymentType === "New Client").reduce((s, p) => s + p.amount, 0);
  const existingClientRev = monthPayments.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + p.amount, 0);
  const totalReceived = newClientRev + existingClientRev;
  const pctOfBooked = revenueBooked > 0 ? Math.round((totalReceived / revenueBooked) * 100) : 0;

  // Weekly data
  const weeks = useMemo(() => getWeeksInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const weeklyData = useMemo(() => weeks.map(w => {
    const wPayments = data.payments.filter(p => {
      const d = new Date(p.date);
      return d >= w.start && d <= w.end;
    });
    const newRev = wPayments.filter(p => p.paymentType === "New Client").reduce((s, p) => s + p.amount, 0);
    const existRev = wPayments.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + p.amount, 0);
    return { name: w.label, "New Client": newRev, "Existing Client": existRev, total: newRev + existRev };
  }), [data.payments, weeks]);

  // Monthly target status
  const monthStatus = getTargetStatus(totalReceived, "monthly");

  // Today's stats
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const todayPayments = data.payments.filter(p => p.date === todayStr);
  const todayNew = todayPayments.filter(p => p.paymentType === "New Client").reduce((s, p) => s + p.amount, 0);
  const todayExisting = todayPayments.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + p.amount, 0);
  const todayTotal = todayNew + todayExisting;
  const todayLeads = data.leads.filter(l => l.date === todayStr).length;
  const todayConverted = data.leads.filter(l => l.date === todayStr && l.stage === "Retained").length;

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const statusColors = {
    green: { bg: "oklch(0.55 0.18 145 / 15%)", border: "oklch(0.55 0.18 145 / 40%)", text: "oklch(0.70 0.18 145)", label: "ON TARGET" },
    yellow: { bg: "oklch(0.72 0.15 80 / 15%)", border: "oklch(0.72 0.15 80 / 40%)", text: "oklch(0.80 0.15 80)", label: "APPROACHING" },
    red: { bg: "oklch(0.60 0.22 25 / 15%)", border: "oklch(0.60 0.22 25 / 40%)", text: "oklch(0.70 0.22 25)", label: "BELOW TARGET" },
  };

  const sc = statusColors[monthStatus];

  return (
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

      {/* ── 7 Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Leads In" value={totalLeads} sub="this month" />
        <StatCard icon={<UserCheck className="w-4 h-4" />} label="Converted" value={converted} sub={`${convRate}% conv. rate`} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Conv. Rate" value={`${convRate}%`} sub={`${converted} of ${totalLeads}`} />
        <StatCard icon={<BookOpen className="w-4 h-4" />} label="Rev. Booked" value={formatCurrency(revenueBooked)} sub={`${converted} retainers signed`} gold />
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="New Client $" value={formatCurrency(newClientRev)} sub="from new clients" />
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="Existing Client $" value={formatCurrency(existingClientRev)} sub="from ongoing cases" />
        <StatCard
          icon={<ArrowUpRight className="w-4 h-4" />}
          label="Total Received"
          value={formatCurrency(totalReceived)}
          sub={`${pctOfBooked}% of booked`}
          statusColor={sc.text}
          statusBg={sc.bg}
          statusBorder={sc.border}
          statusLabel={sc.label}
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
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (TARGETS.monthly.yellow / 80000) * 100)}%`, background: "oklch(0.60 0.22 25 / 30%)" }} />
              {/* Yellow zone */}
              <div className="absolute inset-y-0 rounded-full" style={{ left: `${(TARGETS.monthly.yellow / 80000) * 100}%`, width: `${((TARGETS.monthly.green - TARGETS.monthly.yellow) / 80000) * 100}%`, background: "oklch(0.72 0.15 80 / 30%)" }} />
              {/* Green zone */}
              <div className="absolute inset-y-0 rounded-full" style={{ left: `${(TARGETS.monthly.green / 80000) * 100}%`, right: 0, background: "oklch(0.55 0.18 145 / 30%)" }} />
              {/* Progress */}
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (totalReceived / 80000) * 100)}%`, background: sc.text }} />
            </div>
            <div className="flex justify-between text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>
              <span>{formatCurrency(totalReceived)}</span>
              <span>Target: {formatCurrency(80000)}</span>
            </div>
            {totalReceived < TARGETS.monthly.green && (
              <div className="text-xs mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>
                {formatCurrency(TARGETS.monthly.green - totalReceived)} to reach green zone
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
                const wStatus = getTargetStatus(w.total, "weekly");
                const wSc = statusColors[wStatus];
                const pct = Math.min(100, (w.total / 20000) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs w-14 flex-shrink-0" style={{ color: "oklch(0.55 0.01 250)" }}>{w.name}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden relative" style={{ background: "oklch(0.22 0.025 250)" }}>
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: wSc.text }} />
                      {/* Yellow tick */}
                      <div className="absolute inset-y-0 w-px" style={{ left: `${(TARGETS.weekly.yellow / 20000) * 100}%`, background: "oklch(0.72 0.15 80 / 60%)" }} />
                      {/* Green tick */}
                      <div className="absolute inset-y-0 w-px" style={{ left: `${(TARGETS.weekly.green / 20000) * 100}%`, background: "oklch(0.55 0.18 145 / 60%)" }} />
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
            <ReferenceLine y={TARGETS.weekly.green} stroke="oklch(0.55 0.18 145)" strokeDasharray="6 3" strokeWidth={1.5} />
            <ReferenceLine y={TARGETS.weekly.yellow} stroke="oklch(0.72 0.15 80)" strokeDasharray="6 3" strokeWidth={1.5} />
            <Bar dataKey="New Client" stackId="a" fill="oklch(0.72 0.12 75)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Existing Client" stackId="a" fill="oklch(0.35 0.05 250)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

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
  );
}

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, gold, statusColor, statusBg, statusBorder, statusLabel
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
}) {
  return (
    <div className="stat-card flex flex-col gap-2" style={statusBg ? { background: statusBg, borderColor: statusBorder } : {}}>
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
