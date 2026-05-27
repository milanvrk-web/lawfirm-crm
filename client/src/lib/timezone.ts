/**
 * Timezone utility — Graham Immigration Law, PC
 * All "today" logic uses PST (America/Los_Angeles) so dates don't flip
 * at 4 PM PST (which is UTC midnight).
 */

const TZ = "America/Los_Angeles";

/** Returns today's date string in YYYY-MM-DD format, in PST. */
export function todayPST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // en-CA gives YYYY-MM-DD
}

/** Formats a UTC ISO timestamp for display in PST. */
export function formatPST(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: TZ, ...opts });
}

/** Formats a date-only string (YYYY-MM-DD) for display, always in PST so IST/other TZ users see the same date. */
export function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { timeZone: TZ, ...opts });
}

/** Formats a UTC timestamp for display in PST with date + time. */
export function formatTimestampPST(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

/**
 * Adds N days to a YYYY-MM-DD date string, returning a new YYYY-MM-DD string.
 * Uses midday anchor to avoid any DST/UTC boundary issues.
 */
export function addDaysPST(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD in PST
}

/** Returns tomorrow's date string in YYYY-MM-DD format, in PST. */
export function tomorrowPST(): string {
  return addDaysPST(todayPST(), 1);
}

/** Returns current time as a PST-aware ISO string. */
export function nowPST(): string {
  return new Date().toLocaleString("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(", ", "T") + ":00.000Z";
}
