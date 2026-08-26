/**
 * PSTDatePicker — A timezone-safe date picker that works purely with YYYY-MM-DD strings.
 *
 * WHY THIS EXISTS:
 * Native <input type="date"> interprets its value using the browser's LOCAL timezone.
 * For users in India (IST = UTC+5:30), a stored date of "2026-06-02" gets converted to
 * a Date object at midnight IST → June 1 at 6:30 PM UTC → the picker shows June 1.
 * This component NEVER creates a Date object from a YYYY-MM-DD string. All arithmetic
 * is done on the string parts directly, ensuring every user sees the same PST date.
 *
 * USAGE:
 *   <PSTDatePicker
 *     value="2026-06-02"          // YYYY-MM-DD string or ""
 *     onChange={(v) => ...}       // called with YYYY-MM-DD string
 *     minDate="2026-06-01"        // optional minimum date
 *     placeholder="Select date"   // optional
 *   />
 */

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ── Pure string helpers (no Date objects) ────────────────────────────────────

/** Parse "YYYY-MM-DD" → { year, month, day } (1-indexed month) */
function parseDateStr(s: string): { year: number; month: number; day: number } | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** Format { year, month, day } → "YYYY-MM-DD" */
function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Days in a given month (handles leap years) */
function daysInMonth(year: number, month: number): number {
  // Month is 1-indexed. We use the fact that day 0 of next month = last day of this month.
  // We compute this purely arithmetically to avoid Date timezone issues.
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month];
}

/** Day of week for the 1st of a given month (0=Sun … 6=Sat).
 *  Uses Tomohiko Sakamoto's algorithm — no Date object needed. */
function firstDayOfWeek(year: number, month: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (month < 3) y--;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + 1) % 7;
}

/** Add months to a (year, month) pair, returning the new (year, month) */
function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month - 1 + delta; // 0-indexed
  let y = year + Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return { year: y, month: m + 1 };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ── Component ─────────────────────────────────────────────────────────────────

interface PSTDatePickerProps {
  value: string;           // YYYY-MM-DD or ""
  onChange: (v: string) => void;
  minDate?: string;        // YYYY-MM-DD — dates before this are disabled
  placeholder?: string;
  /** If provided, renders as a controlled popover trigger instead of standalone */
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
  /** Called when popover closes without selecting (for external controlled state) */
  onClose?: () => void;
  /** If true, the calendar is always visible (no trigger button) */
  inline?: boolean;
  /** Reduce spacing and cell sizing for compact modal/card layouts */
  compact?: boolean;
  disabled?: boolean;
}

export function PSTDatePicker({
  value,
  onChange,
  minDate,
  placeholder = "Select date",
  triggerClassName,
  triggerContent,
  onClose,
  inline = false,
  compact = false,
  disabled = false,
}: PSTDatePickerProps) {
  const parsed = parseDateStr(value);

  // Determine initial view month: use value if set, else today PST
  const getInitialView = () => {
    if (parsed) return { year: parsed.year, month: parsed.month };
    // Get today in PST without creating a Date from a YYYY-MM-DD string
    const now = new Date();
    const pstStr = now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    const p = parseDateStr(pstStr);
    return p ? { year: p.year, month: p.month } : { year: 2026, month: 6 };
  };

  const [viewYear, setViewYear] = useState(getInitialView().year);
  const [viewMonth, setViewMonth] = useState(getInitialView().month);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync view when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open && !inline) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, inline, onClose]);

  // Get today in PST as YYYY-MM-DD string
  const todayPST = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

  const handlePrevMonth = () => {
    const { year, month } = addMonths(viewYear, viewMonth, -1);
    setViewYear(year);
    setViewMonth(month);
  };
  const handleNextMonth = () => {
    const { year, month } = addMonths(viewYear, viewMonth, 1);
    setViewYear(year);
    setViewMonth(month);
  };

  const handleDayClick = (day: number) => {
    const dateStr = formatDateStr(viewYear, viewMonth, day);
    if (minDate && dateStr < minDate) return;
    onChange(dateStr);
    if (!inline) {
      setOpen(false);
    }
  };

  // Build calendar grid
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDow = firstDayOfWeek(viewYear, viewMonth); // 0=Sun

  // Display value
  const displayValue = parsed
    ? `${MONTH_NAMES[parsed.month - 1]} ${parsed.day}, ${parsed.year}`
    : placeholder;

  const calendar = (
    <div
      className={compact ? "p-2 rounded-lg shadow-xl" : "p-3 rounded-xl shadow-2xl"}
      style={{
        background: "oklch(0.18 0.025 250)",
        border: "1px solid oklch(1 0 0 / 14%)",
        minWidth: compact ? "220px" : "240px",
        userSelect: "none",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Month navigation */}
      <div className={`flex items-center justify-between ${compact ? "mb-2" : "mb-3"}`}>
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: "oklch(0.65 0.01 250)" }}
          type="button"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className={`${compact ? "text-xs" : "text-sm"} font-semibold`} style={{ color: "oklch(0.90 0.005 250)" }}>
          {MONTH_NAMES[viewMonth - 1]} {viewYear}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: "oklch(0.65 0.01 250)" }}
          type="button"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div
            key={d}
            className={`text-center text-[10px] font-semibold ${compact ? "py-0.5" : "py-1"}`}
            style={{ color: "oklch(0.45 0.01 250)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className={`grid grid-cols-7 ${compact ? "gap-y-0" : "gap-y-0.5"}`}>
        {/* Leading empty cells */}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDateStr(viewYear, viewMonth, day);
          const isSelected = dateStr === value;
          const isToday = dateStr === todayPST;
          const isDisabled = !!(minDate && dateStr < minDate);

          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              onClick={() => handleDayClick(day)}
              className={`w-full aspect-square flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"} rounded transition-colors`}
              style={{
                background: isSelected
                  ? "oklch(0.72 0.12 75)"
                  : isToday
                  ? "oklch(0.72 0.12 75 / 15%)"
                  : "transparent",
                color: isSelected
                  ? "oklch(0.13 0.025 250)"
                  : isDisabled
                  ? "oklch(0.30 0.01 250)"
                  : isToday
                  ? "oklch(0.72 0.12 75)"
                  : "oklch(0.82 0.005 250)",
                fontWeight: isSelected || isToday ? "600" : "400",
                cursor: isDisabled ? "not-allowed" : "pointer",
                border: isToday && !isSelected ? "1px solid oklch(0.72 0.12 75 / 40%)" : "1px solid transparent",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <div className={`${compact ? "mt-1 pt-1" : "mt-2 pt-2"} border-t`} style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
        <button
          type="button"
          onClick={() => {
            onChange(todayPST);
            if (!inline) setOpen(false);
          }}
          className={`w-full text-xs ${compact ? "py-0.5" : "py-1"} rounded transition-colors hover:bg-white/8`}
          style={{ color: "oklch(0.65 0.15 200)" }}
        >
          Today (PST)
        </button>
      </div>
    </div>
  );

  if (inline) {
    return <div ref={containerRef}>{calendar}</div>;
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(p => !p)}
        className={triggerClassName}
      >
        {triggerContent ?? (
          <span style={{ color: parsed ? "oklch(0.90 0.005 250)" : "oklch(0.45 0.01 250)" }}>
            {displayValue}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-1" style={{ right: 0 }}>
          {calendar}
        </div>
      )}
    </div>
  );
}

export default PSTDatePicker;
