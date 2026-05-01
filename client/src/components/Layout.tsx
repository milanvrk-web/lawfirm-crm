/* ============================================================
   Law Firm CRM — Layout Component
   Design: Dark Luxury Legal — Fixed left sidebar, gold accents
   Nav: Dashboard | Leads | Payments | Clients | Close Day | All Data
   ============================================================ */

import { useState } from "react";
import { Link, useLocation } from "wouter";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/leads", icon: Users, label: "Leads" },
  { path: "/payments", icon: DollarSign, label: "Payments" },
  { path: "/clients", icon: BookOpen, label: "Clients" },
  { path: "/close-day", icon: CalendarCheck, label: "Close Day" },
  { path: "/all-data", icon: Database, label: "All Data" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: "oklch(0.72 0.12 75)" }}
          >
            <Scale className="w-5 h-5" style={{ color: "oklch(0.13 0.025 250)" }} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide" style={{ color: "oklch(0.93 0.005 250)", fontFamily: "'Playfair Display', serif" }}>
              Law Firm CRM
            </div>
            <div className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>Operations Dashboard</div>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setMobileOpen(false)}
            style={{ color: "oklch(0.55 0.01 250)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
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
                  <span>{label}</span>
                  {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="text-xs" style={{ color: "oklch(0.40 0.01 250)" }}>
            April 2026 data pre-loaded
          </div>
          <div className="text-xs mt-0.5" style={{ color: "oklch(0.35 0.01 250)" }}>
            Data saved locally in browser
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
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            <span className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 250)", fontFamily: "'Playfair Display', serif" }}>
              Law Firm CRM
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
