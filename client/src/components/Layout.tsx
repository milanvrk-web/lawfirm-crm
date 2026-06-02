import { todayPST, addDaysPST } from "@/lib/timezone";
/* ============================================================
   Graham Immigration Law, PC — Layout Component
   Design: Dark Luxury Legal — Fixed left sidebar, gold accents
   Nav: Dashboard | Leads | Payments | Clients | Follow-Ups | Close Day | All Data
   ============================================================ */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useActiveMember } from "@/contexts/ActiveMemberContext";
import { trpc } from "@/lib/trpc";
import { Link, useLocation, useRoute } from "wouter";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  BookOpen,
  CalendarCheck,
  Database,
  Scale,
  Menu,
  X,
  ChevronRight,
  Bell,
  Settings2,
  UserCog,
  Search,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCRM } from "@/contexts/CRMContext";
import { getDueTodayFollowUps, getOverdueFollowUps, formatCurrency } from "@/lib/store";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

const BASE_NAV = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/leads", icon: Users, label: "Leads" },
  { path: "/payments", icon: DollarSign, label: "Payments" },
  { path: "/clients", icon: BookOpen, label: "Clients" },
  { path: "/follow-ups", icon: Bell, label: "Follow-Ups" },
  { path: "/close-day", icon: CalendarCheck, label: "Close Day" },
  { path: "/all-data", icon: Database, label: "All Data" },
  { path: "/members", icon: UserCog, label: "Members" },
  { path: "/settings", icon: Settings2, label: "Settings" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { followUps, leads, payments } = useCRM();
  const { activeMember, setActiveMember } = useActiveMember();
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const { data: members = [] } = trpc.members.list.useQuery();

  // ── Global Search ─────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Open on Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(open => !open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const q = searchQuery.toLowerCase().trim();

  const matchedLeads = useMemo(() => {
    if (!q) return [];
    return leads
      .filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.caseNumber?.toLowerCase().includes(q) ||
        l.caseType?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [leads, q]);

  const matchedPayments = useMemo(() => {
    if (!q) return [];
    return payments
      .filter(p =>
        p.clientName.toLowerCase().includes(q) ||
        p.caseNumber?.toLowerCase().includes(q) ||
        p.receivedFor?.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [payments, q]);

  const matchedPages = useMemo(() => {
    if (!q) return BASE_NAV;
    return BASE_NAV.filter(n => n.label.toLowerCase().includes(q));
  }, [q]);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    setSearchOpen(false);
    setSearchQuery("");
  }, [navigate]);

  // ── Follow-up urgency badge (uses followUpDate on leads) ───
  const urgentCount = useMemo(() => {
    const today = todayPST();
    return leads.filter(l => l.followUpDate && l.followUpDate <= today).length;
  }, [leads]);

  // Count leads with no follow-up activity in 7+ days (escalation)
  // Uses the most recent of: lead creation date, latest payment date, or followUpDate
  const stalePipelineCount = useMemo(() => {
    const cutoffStr = addDaysPST(todayPST(), -7);
    return leads.filter(l => {
      if (l.stage === "Lost" || l.stage === "Retained" || l.stage === "Onboarding") return false;
      // Use followUpDate as a strong signal of recent activity
      if (l.followUpDate && l.followUpDate >= cutoffStr) return false;
      // Fall back to lead creation date
      return l.date < cutoffStr;
    }).length;
  }, [leads]);

  return (
    <div className="flex min-h-screen" style={{ background: "oklch(0.13 0.025 250)" }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300",
          "w-64 border-r",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: "oklch(0.15 0.03 250)",
          borderColor: "oklch(1 0 0 / 8%)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          <img
            src="/manus-storage/graham-logo_86d1eaea.png"
            alt="Graham Immigration Law, P.C."
            className="h-12 w-auto object-contain"
          />
          <button
            className="ml-2 lg:hidden"
            onClick={() => setMobileOpen(false)}
            style={{ color: "oklch(0.55 0.01 250)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search trigger */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-90"
            style={{ background: "oklch(0.20 0.025 250)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.50 0.01 250)" }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left text-xs">Search leads, payments…</span>
            <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.25 0.025 250)", color: "oklch(0.45 0.01 250)", fontFamily: "monospace" }}>
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {BASE_NAV.map(({ path, icon: Icon, label }) => {
            const active = location === path;
            return (
              <Link key={path} href={path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                    active ? "gold-border-left" : "border-l-3 border-transparent"
                  )}
                  style={{
                    background: active ? "oklch(0.72 0.12 75 / 12%)" : "transparent",
                    color: active ? "oklch(0.72 0.12 75)" : "oklch(0.65 0.01 250)",
                    borderLeft: active ? "3px solid oklch(0.72 0.12 75)" : "3px solid transparent",
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {/* Urgent badge on Follow-Ups */}
                  {path === "/follow-ups" && urgentCount > 0 && (
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                      style={{ background: "oklch(0.70 0.22 25)", color: "white", fontSize: "10px" }}
                    >
                      {urgentCount}
                    </span>
                  )}
                  {/* Stale pipeline escalation badge on Leads */}
                  {path === "/leads" && stalePipelineCount > 0 && (
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                      style={{ background: "oklch(0.72 0.15 80 / 90%)", color: "oklch(0.13 0.025 250)", fontSize: "10px" }}
                      title={`${stalePipelineCount} leads with no activity in 7+ days`}
                    >
                      {stalePipelineCount}
                    </span>
                  )}
                  {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Active Member Selector */}
        <div className="px-4 py-3 border-t relative" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          <button
            onClick={() => setMemberPickerOpen(p => !p)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ background: activeMember ? "oklch(0.20 0.025 250)" : "oklch(0.55 0.18 250 / 15%)", border: "1px solid oklch(1 0 0 / 10%)" }}
          >
            {activeMember ? (
              <>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: activeMember.color, color: "oklch(0.10 0 0)" }}>
                  {activeMember.name.trim().split(/\s+/).map((w: string) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-semibold truncate" style={{ color: "oklch(0.88 0.005 250)" }}>{activeMember.name}</div>
                  <div className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>{activeMember.role}</div>
                </div>
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.55 0.18 250 / 20%)", border: "1px dashed oklch(0.55 0.18 250 / 50%)" }}>
                  <span className="text-xs" style={{ color: "oklch(0.55 0.18 250)" }}>?</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-semibold" style={{ color: "oklch(0.55 0.18 250)" }}>Select your name</div>
                  <div className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>Notes will be signed</div>
                </div>
              </>
            )}
          </button>

          {/* Dropdown */}
          {memberPickerOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-1 rounded-xl overflow-hidden shadow-xl z-50" style={{ background: "oklch(0.18 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)" }}>
              {members.length === 0 ? (
                <div className="px-4 py-3 text-xs text-center" style={{ color: "oklch(0.50 0.01 250)" }}>No members yet — add them in Members page</div>
              ) : (
                members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setActiveMember({ id: m.id, name: m.name, color: m.color, role: m.role }); setMemberPickerOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:opacity-80 transition-opacity"
                    style={{ background: activeMember?.id === m.id ? "oklch(0.55 0.18 250 / 15%)" : "transparent" }}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: m.color, color: "oklch(0.10 0 0)" }}>
                      {m.name.trim().split(/\s+/).map((w: string) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-xs font-semibold" style={{ color: "oklch(0.88 0.005 250)" }}>{m.name}</div>
                      <div className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>{m.role}</div>
                    </div>
                    {activeMember?.id === m.id && <span className="text-xs" style={{ color: "oklch(0.55 0.18 250)" }}>✓</span>}
                  </button>
                ))
              )}
              {activeMember && (
                <button
                  onClick={() => { setActiveMember(null); setMemberPickerOpen(false); }}
                  className="w-full px-3 py-2 text-xs text-left border-t hover:opacity-80 transition-opacity"
                  style={{ color: "oklch(0.55 0.22 25)", borderColor: "oklch(1 0 0 / 8%)" }}
                >
                  Switch Account
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-md" style={{ background: "oklch(0.72 0.12 75 / 10%)", border: "1px solid oklch(0.72 0.12 75 / 20%)" }}>
            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "oklch(0.72 0.12 75)" }} />
            <span className="text-xs font-medium" style={{ color: "oklch(0.72 0.12 75)" }}>All times in PST</span>
          </div>
          <div className="text-xs" style={{ color: "oklch(0.40 0.01 250)" }}>
            Graham Immigration Law, PC v2.0
          </div>
          <div className="text-xs mt-0.5" style={{ color: "oklch(0.35 0.01 250)" }}>
            Data synced to cloud database
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Mobile header */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-20"
          style={{ background: "oklch(0.15 0.03 250)", borderColor: "oklch(1 0 0 / 8%)" }}
        >
          <button onClick={() => setMobileOpen(true)} style={{ color: "oklch(0.65 0.01 250)" }}>
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="/manus-storage/graham-logo_86d1eaea.png"
            alt="Graham Immigration Law, P.C."
            className="h-8 w-auto object-contain"
          />
          {/* PST timezone label — mobile */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: "oklch(0.72 0.12 75 / 12%)", border: "1px solid oklch(0.72 0.12 75 / 25%)" }}>
            <Clock className="w-3 h-3" style={{ color: "oklch(0.72 0.12 75)" }} />
            <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: "oklch(0.72 0.12 75)" }}>PST</span>
          </div>
          {/* Mobile search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="ml-auto p-1.5 rounded-lg"
            style={{ color: "oklch(0.55 0.01 250)" }}
          >
            <Search className="w-4 h-4" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* ── Global Search Palette ─────────────────────────────── */}
      <CommandDialog
        open={searchOpen}
        onOpenChange={open => { setSearchOpen(open); if (!open) setSearchQuery(""); }}
      >
        <CommandInput
          placeholder="Search leads, payments, pages…"
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Leads */}
          {matchedLeads.length > 0 && (
            <CommandGroup heading="Leads">
              {matchedLeads.map(lead => (
                <CommandItem
                  key={lead.id}
                  value={`lead-${lead.id}-${lead.name}`}
                  onSelect={() => handleSelect("/leads")}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Users className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.72 0.12 75)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{lead.name}</div>
                    <div className="text-xs truncate" style={{ color: "oklch(0.55 0.01 250)" }}>
                      {lead.caseType} · #{lead.caseNumber || "—"} · {lead.stage}
                    </div>
                  </div>
                  {lead.retainerBooked > 0 && (
                    <span className="text-xs flex-shrink-0" style={{ color: "oklch(0.72 0.12 75)" }}>
                      {formatCurrency(lead.retainerBooked)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {matchedLeads.length > 0 && matchedPayments.length > 0 && <CommandSeparator />}

          {/* Payments */}
          {matchedPayments.length > 0 && (
            <CommandGroup heading="Payments">
              {matchedPayments.map(payment => (
                <CommandItem
                  key={payment.id}
                  value={`payment-${payment.id}-${payment.clientName}`}
                  onSelect={() => handleSelect("/payments")}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <DollarSign className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.65 0.18 145)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{payment.clientName}</div>
                    <div className="text-xs truncate" style={{ color: "oklch(0.55 0.01 250)" }}>
                      {payment.date} · {payment.receivedFor}
                    </div>
                  </div>
                  <span className="text-xs flex-shrink-0 font-semibold" style={{ color: "oklch(0.65 0.18 145)" }}>
                    {formatCurrency(payment.amount)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(matchedLeads.length > 0 || matchedPayments.length > 0) && matchedPages.length > 0 && <CommandSeparator />}

          {/* Pages */}
          {matchedPages.length > 0 && (
            <CommandGroup heading="Pages">
              {matchedPages.map(({ path, icon: Icon, label }) => (
                <CommandItem
                  key={path}
                  value={`page-${path}-${label}`}
                  onSelect={() => handleSelect(path)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.55 0.01 250)" }} />
                  <span className="text-sm">{label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
