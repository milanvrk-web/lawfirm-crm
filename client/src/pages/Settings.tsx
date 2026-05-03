/* ============================================================
   Law Firm CRM — Settings Page
   Design: Dark Luxury Legal — Navy + Gold
   Features: Revenue target adjustment (monthly + weekly)
   ============================================================ */

import { useState } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { DEFAULT_TARGETS } from "@/lib/store";
import { Settings2, Target, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function formatCurrencyInput(val: number): string {
  return val.toLocaleString("en-US");
}

function parseCurrencyInput(str: string): number {
  const n = parseInt(str.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

export default function Settings() {
  const { targets, updateTargets } = useCRM();

  // Local form state (strings for input display)
  const [monthlyGreen, setMonthlyGreen] = useState(String(targets.monthly.green));
  const [monthlyYellow, setMonthlyYellow] = useState(String(targets.monthly.yellow));
  const [weeklyGreen, setWeeklyGreen] = useState(String(targets.weekly.green));
  const [weeklyYellow, setWeeklyYellow] = useState(String(targets.weekly.yellow));
  const [saved, setSaved] = useState(false);

  const mGreen = parseCurrencyInput(monthlyGreen);
  const mYellow = parseCurrencyInput(monthlyYellow);
  const wGreen = parseCurrencyInput(weeklyGreen);
  const wYellow = parseCurrencyInput(weeklyYellow);

  // Validation
  const monthlyValid = mGreen > 0 && mYellow > 0 && mGreen > mYellow;
  const weeklyValid = wGreen > 0 && wYellow > 0 && wGreen > wYellow;
  const allValid = monthlyValid && weeklyValid;

  const handleSave = () => {
    if (!allValid) return;
    updateTargets({
      monthly: { green: mGreen, yellow: mYellow },
      weekly: { green: wGreen, yellow: wYellow },
    });
    setSaved(true);
    toast.success("Targets updated — Dashboard will reflect new values immediately.");
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setMonthlyGreen(String(DEFAULT_TARGETS.monthly.green));
    setMonthlyYellow(String(DEFAULT_TARGETS.monthly.yellow));
    setWeeklyGreen(String(DEFAULT_TARGETS.weekly.green));
    setWeeklyYellow(String(DEFAULT_TARGETS.weekly.yellow));
    updateTargets(DEFAULT_TARGETS);
    toast.info("Targets reset to defaults.");
    setSaved(false);
  };

  const inputStyle = {
    background: "oklch(0.16 0.015 250)",
    border: "1px solid oklch(0.30 0.02 250)",
    color: "oklch(0.93 0.005 250)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.95rem",
    width: "100%",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    fontSize: "0.78rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "oklch(0.55 0.01 250)",
    marginBottom: "0.4rem",
    display: "block",
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ background: "oklch(0.72 0.12 75 / 15%)" }}>
          <Settings2 size={22} style={{ color: "oklch(0.80 0.12 75)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
            Settings
          </h1>
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>
            Adjust revenue targets — changes apply immediately to the Dashboard
          </p>
        </div>
      </div>

      {/* Revenue Targets Card */}
      <div className="rounded-xl p-6 space-y-6" style={{ background: "oklch(0.16 0.015 250)", border: "1px solid oklch(0.25 0.02 250)" }}>
        <div className="flex items-center gap-2">
          <Target size={18} style={{ color: "oklch(0.72 0.12 75)" }} />
          <h2 className="text-base font-semibold" style={{ color: "oklch(0.93 0.005 250)" }}>
            Revenue Targets
          </h2>
        </div>

        {/* Color legend */}
        <div className="flex flex-wrap gap-4 text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: "oklch(0.55 0.18 145)" }} />
            Green = On Target (≥ green threshold)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: "oklch(0.72 0.15 80)" }} />
            Yellow = Approaching (≥ yellow threshold)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: "oklch(0.60 0.22 25)" }} />
            Red = Below Target (&lt; yellow threshold)
          </span>
        </div>

        {/* Monthly Targets */}
        <div>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "oklch(0.72 0.12 75)", letterSpacing: "0.05em" }}>
            MONTHLY TARGETS
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Green Zone (On Target) $</label>
              <input
                type="text"
                inputMode="numeric"
                value={monthlyGreen}
                onChange={e => setMonthlyGreen(e.target.value)}
                onFocus={e => e.target.select()}
                style={{
                  ...inputStyle,
                  borderColor: !monthlyValid && mGreen <= mYellow && mGreen > 0 ? "oklch(0.60 0.22 25 / 60%)" : "oklch(0.30 0.02 250)",
                }}
                placeholder="70000"
              />
              <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>
                Current: ${mGreen.toLocaleString()}
              </p>
            </div>
            <div>
              <label style={labelStyle}>Yellow Zone (Approaching) $</label>
              <input
                type="text"
                inputMode="numeric"
                value={monthlyYellow}
                onChange={e => setMonthlyYellow(e.target.value)}
                onFocus={e => e.target.select()}
                style={{
                  ...inputStyle,
                  borderColor: !monthlyValid && mYellow >= mGreen && mYellow > 0 ? "oklch(0.60 0.22 25 / 60%)" : "oklch(0.30 0.02 250)",
                }}
                placeholder="50000"
              />
              <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>
                Current: ${mYellow.toLocaleString()}
              </p>
            </div>
          </div>
          {!monthlyValid && mGreen > 0 && mYellow > 0 && (
            <p className="text-xs mt-2" style={{ color: "oklch(0.70 0.22 25)" }}>
              Green must be greater than Yellow
            </p>
          )}
          {/* Monthly preview bar */}
          <div className="mt-4 h-3 rounded-full overflow-hidden relative" style={{ background: "oklch(0.60 0.22 25 / 30%)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.min(100, (mYellow / (mGreen * 1.2)) * 100)}%`,
                background: "oklch(0.72 0.15 80 / 60%)",
              }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.min(100, (mGreen / (mGreen * 1.2)) * 100)}%`,
                background: "oklch(0.55 0.18 145 / 60%)",
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>
            <span>$0</span>
            <span style={{ color: "oklch(0.72 0.15 80)" }}>Yellow: ${mYellow.toLocaleString()}</span>
            <span style={{ color: "oklch(0.55 0.18 145)" }}>Green: ${mGreen.toLocaleString()}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid oklch(0.25 0.02 250)" }} />

        {/* Weekly Targets */}
        <div>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "oklch(0.72 0.12 75)", letterSpacing: "0.05em" }}>
            WEEKLY TARGETS
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Green Zone (On Target) $</label>
              <input
                type="text"
                inputMode="numeric"
                value={weeklyGreen}
                onChange={e => setWeeklyGreen(e.target.value)}
                onFocus={e => e.target.select()}
                style={{
                  ...inputStyle,
                  borderColor: !weeklyValid && wGreen <= wYellow && wGreen > 0 ? "oklch(0.60 0.22 25 / 60%)" : "oklch(0.30 0.02 250)",
                }}
                placeholder="17500"
              />
              <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>
                Current: ${wGreen.toLocaleString()}
              </p>
            </div>
            <div>
              <label style={labelStyle}>Yellow Zone (Approaching) $</label>
              <input
                type="text"
                inputMode="numeric"
                value={weeklyYellow}
                onChange={e => setWeeklyYellow(e.target.value)}
                onFocus={e => e.target.select()}
                style={{
                  ...inputStyle,
                  borderColor: !weeklyValid && wYellow >= wGreen && wYellow > 0 ? "oklch(0.60 0.22 25 / 60%)" : "oklch(0.30 0.02 250)",
                }}
                placeholder="12500"
              />
              <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>
                Current: ${wYellow.toLocaleString()}
              </p>
            </div>
          </div>
          {!weeklyValid && wGreen > 0 && wYellow > 0 && (
            <p className="text-xs mt-2" style={{ color: "oklch(0.70 0.22 25)" }}>
              Green must be greater than Yellow
            </p>
          )}
          {/* Weekly preview bar */}
          <div className="mt-4 h-3 rounded-full overflow-hidden relative" style={{ background: "oklch(0.60 0.22 25 / 30%)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.min(100, (wYellow / (wGreen * 1.2)) * 100)}%`,
                background: "oklch(0.72 0.15 80 / 60%)",
              }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.min(100, (wGreen / (wGreen * 1.2)) * 100)}%`,
                background: "oklch(0.55 0.18 145 / 60%)",
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: "oklch(0.45 0.01 250)" }}>
            <span>$0</span>
            <span style={{ color: "oklch(0.72 0.15 80)" }}>Yellow: ${wYellow.toLocaleString()}</span>
            <span style={{ color: "oklch(0.55 0.18 145)" }}>Green: ${wGreen.toLocaleString()}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!allValid}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: saved ? "oklch(0.55 0.18 145 / 80%)" : "oklch(0.72 0.12 75)",
              color: "oklch(0.12 0.01 250)",
            }}
          >
            {saved ? <CheckCircle2 size={16} /> : <Target size={16} />}
            {saved ? "Saved!" : "Save Targets"}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 active:scale-95"
            style={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(0.30 0.02 250)", color: "oklch(0.65 0.01 250)" }}
          >
            <RotateCcw size={14} />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl p-4 text-sm" style={{ background: "oklch(0.72 0.12 75 / 8%)", border: "1px solid oklch(0.72 0.12 75 / 20%)", color: "oklch(0.70 0.08 75)" }}>
        <strong>Defaults:</strong> Monthly Green $70,000 · Yellow $50,000 &nbsp;|&nbsp; Weekly Green $17,500 · Yellow $12,500. Changes are saved in your browser and persist across sessions.
      </div>
    </div>
  );
}
