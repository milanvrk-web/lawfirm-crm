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
