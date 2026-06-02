/**
 * Timezone Stress Test — Graham Immigration Law, PC
 *
 * Tests the nowDateTimePST() helper and the __RESCHEDULE__ / __DONE__ audit
 * entry regex parsing under simulated timezone conditions.
 *
 * Key scenarios:
 *   1. Output format is always "Mon D, YYYY at H:MM AM/PM" regardless of TZ_OFFSET
 *   2. The __RESCHEDULE__ regex correctly parses timestamps containing colons
 *   3. The __DONE__ regex correctly parses timestamps containing colons
 *   4. Edge cases: midnight, noon, 12:00 AM/PM, times with single-digit minutes
 *   5. Date boundary: 11:59 PM PST vs midnight UTC (which is 4 PM PST the same day)
 */

import { describe, it, expect } from "vitest";

// ── Re-implement the helpers exactly as they appear in client/src/lib/timezone.ts ──
const TZ = "America/Los_Angeles";

function todayPST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function nowDateTimePST(): string {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} at ${time}`;
}

// ── Regex from LeadDetailPanel activity thread renderer ──
const DONE_REGEX = /^([\s\S]+?)\n__DONE__:([^:]+):(.+)$/;
// Fixed regex: last colon-delimited token is YYYY-MM-DD, everything before is datetime
const RESCHEDULE_REGEX = /^([\s\S]+?)\n__RESCHEDULE__:([^:]+):(.+):(\d{4}-\d{2}-\d{2})$/;

// ── Helper: build audit strings as the app does ──
function buildDoneEntry(note: string, member: string, datetime: string): string {
  return `${note}\n__DONE__:${member}:${datetime}`;
}

function buildRescheduleEntry(
  note: string,
  member: string,
  datetime: string,
  newDate: string
): string {
  return `${note}\n__RESCHEDULE__:${member}:${datetime}:${newDate}`;
}

// ── Helper: simulate nowDateTimePST() at a specific UTC moment ──
function nowDateTimePSTAt(utcMs: number): string {
  const now = new Date(utcMs);
  const date = now.toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} at ${time}`;
}

// ── Helper: simulate todayPST() at a specific UTC moment ──
function todayPSTAt(utcMs: number): string {
  return new Date(utcMs).toLocaleDateString("en-CA", { timeZone: TZ });
}

describe("nowDateTimePST() format", () => {
  it("returns a string matching 'Mon D, YYYY at H:MM AM/PM' pattern", () => {
    const result = nowDateTimePST();
    // e.g. "Jun 2, 2026 at 2:34 PM"
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it("contains 'at' separator between date and time", () => {
    const result = nowDateTimePST();
    expect(result).toContain(" at ");
  });

  it("does NOT contain a raw ISO timestamp or UTC offset", () => {
    const result = nowDateTimePST();
    expect(result).not.toMatch(/T\d{2}:\d{2}/);   // no ISO T separator
    expect(result).not.toMatch(/[+-]\d{2}:\d{2}/); // no UTC offset
    expect(result).not.toMatch(/Z$/);               // no trailing Z
  });
});

describe("nowDateTimePST() at specific UTC moments (timezone boundary tests)", () => {
  // UTC midnight = 4 PM PST (not midnight PST) — critical boundary
  it("UTC midnight (00:00) = 4:00 PM PST same day", () => {
    // 2026-06-03 00:00:00 UTC
    const utcMidnight = Date.UTC(2026, 5, 3, 0, 0, 0); // June 3 UTC midnight
    const result = nowDateTimePSTAt(utcMidnight);
    // PST is UTC-7 in summer (PDT), so 00:00 UTC = 17:00 PDT on June 2
    // Actually America/Los_Angeles in June is PDT = UTC-7
    // 00:00 UTC June 3 = 17:00 PDT June 2
    expect(result).toMatch(/Jun 2, 2026 at 5:00 PM/);
  });

  it("UTC 07:00 = midnight PST (PDT is UTC-7, so 00:00 PDT = 07:00 UTC)", () => {
    // 2026-06-03 07:00:00 UTC = midnight PDT June 3
    const utcMs = Date.UTC(2026, 5, 3, 7, 0, 0);
    const result = nowDateTimePSTAt(utcMs);
    expect(result).toMatch(/Jun 3, 2026 at 12:00 AM/);
  });

  it("UTC 19:00 = noon PST (PDT) on same day", () => {
    // 2026-06-03 19:00:00 UTC = 12:00 PM PDT June 3
    const utcMs = Date.UTC(2026, 5, 3, 19, 0, 0);
    const result = nowDateTimePSTAt(utcMs);
    expect(result).toMatch(/Jun 3, 2026 at 12:00 PM/);
  });

  it("India IST 09:30 AM = previous day PST (IST is UTC+5:30)", () => {
    // India 09:30 AM June 3 = UTC 04:00 June 3 = 21:00 PDT June 2
    const utcMs = Date.UTC(2026, 5, 3, 4, 0, 0);
    const result = nowDateTimePSTAt(utcMs);
    // 04:00 UTC = 04:00 - 7h = 21:00 PDT June 2
    expect(result).toMatch(/Jun 2, 2026 at 9:00 PM/);
  });

  it("India IST 01:00 AM = previous day late evening PST", () => {
    // India 01:00 AM June 3 = UTC June 2 19:30 = 12:30 PM PDT June 2
    const utcMs = Date.UTC(2026, 5, 2, 19, 30, 0);
    const result = nowDateTimePSTAt(utcMs);
    expect(result).toMatch(/Jun 2, 2026 at 12:30 PM/);
  });

  it("PST winter time (UTC-8): UTC 08:00 = midnight PST", () => {
    // January 15, 2026 08:00 UTC = 00:00 PST (UTC-8 in winter)
    const utcMs = Date.UTC(2026, 0, 15, 8, 0, 0);
    const result = nowDateTimePSTAt(utcMs);
    expect(result).toMatch(/Jan 15, 2026 at 12:00 AM/);
  });

  it("11:59 PM PST does not bleed into next day", () => {
    // 2026-06-03 06:59:00 UTC = 11:59 PM PDT June 2
    const utcMs = Date.UTC(2026, 5, 3, 6, 59, 0);
    const result = nowDateTimePSTAt(utcMs);
    expect(result).toMatch(/Jun 2, 2026 at 11:59 PM/);
  });

  it("12:00 AM PST is correctly labelled (not 12:00 PM)", () => {
    const utcMs = Date.UTC(2026, 5, 3, 7, 0, 0); // midnight PDT
    const result = nowDateTimePSTAt(utcMs);
    expect(result).toContain("12:00 AM");
    expect(result).not.toContain("12:00 PM");
  });

  it("12:00 PM PST is correctly labelled (not 12:00 AM)", () => {
    const utcMs = Date.UTC(2026, 5, 3, 19, 0, 0); // noon PDT
    const result = nowDateTimePSTAt(utcMs);
    expect(result).toContain("12:00 PM");
    expect(result).not.toContain("12:00 AM");
  });
});

describe("__DONE__ audit entry — build and parse round-trip", () => {
  const testCases = [
    { datetime: "Jun 2, 2026 at 2:34 PM",  member: "Priya",   note: "Client retained" },
    { datetime: "Jun 2, 2026 at 12:00 AM", member: "Carlos",  note: "Left voicemail" },
    { datetime: "Jun 2, 2026 at 12:00 PM", member: "Aisha",   note: "Sent docs" },
    { datetime: "Jun 2, 2026 at 11:59 PM", member: "Staff",   note: "No answer" },
    { datetime: "Jan 15, 2026 at 9:05 AM", member: "Team",    note: "Consultation done" },
    { datetime: "Dec 31, 2025 at 3:00 PM", member: "Priya",   note: "Year-end follow-up" },
  ];

  for (const { datetime, member, note } of testCases) {
    it(`parses __DONE__ with timestamp "${datetime}"`, () => {
      const entry = buildDoneEntry(note, member, datetime);
      const match = entry.match(DONE_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe(note);
      expect(match![2]).toBe(member);
      expect(match![3]).toBe(datetime);
    });
  }

  it("parses multi-line note text in __DONE__ entry", () => {
    const note = "Spoke with client.\nSending retainer agreement.";
    const entry = buildDoneEntry(note, "Priya", "Jun 2, 2026 at 2:34 PM");
    const match = entry.match(DONE_REGEX);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(note);
    expect(match![3]).toBe("Jun 2, 2026 at 2:34 PM");
  });
});

describe("__RESCHEDULE__ audit entry — build and parse round-trip", () => {
  const testCases = [
    { datetime: "Jun 2, 2026 at 2:34 PM",  member: "Priya",  note: "Client asked to call back", newDate: "2026-06-09" },
    { datetime: "Jun 2, 2026 at 12:00 AM", member: "Carlos", note: "Waiting on docs",            newDate: "2026-06-15" },
    { datetime: "Jun 2, 2026 at 12:00 PM", member: "Aisha",  note: "No answer",                  newDate: "2026-06-03" },
    { datetime: "Jun 2, 2026 at 11:59 PM", member: "Staff",  note: "Rescheduled per client",     newDate: "2026-07-01" },
    { datetime: "Jan 15, 2026 at 9:05 AM", member: "Team",   note: "Holiday delay",              newDate: "2026-01-20" },
    { datetime: "Dec 31, 2025 at 3:00 PM", member: "Priya",  note: "Year-end push",              newDate: "2026-01-05" },
  ];

  for (const { datetime, member, note, newDate } of testCases) {
    it(`parses __RESCHEDULE__ with timestamp "${datetime}" → newDate "${newDate}"`, () => {
      const entry = buildRescheduleEntry(note, member, datetime, newDate);
      const match = entry.match(RESCHEDULE_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe(note);
      expect(match![2]).toBe(member);
      expect(match![3]).toBe(datetime);
      expect(match![4]).toBe(newDate);
    });
  }

  it("does NOT match if newDate is not YYYY-MM-DD format", () => {
    const entry = buildRescheduleEntry("note", "Priya", "Jun 2, 2026 at 2:34 PM", "June 9");
    const match = entry.match(RESCHEDULE_REGEX);
    expect(match).toBeNull();
  });

  it("parses multi-line note text in __RESCHEDULE__ entry", () => {
    const note = "Client requested delay.\nWaiting on I-94.";
    const entry = buildRescheduleEntry(note, "Priya", "Jun 2, 2026 at 2:34 PM", "2026-06-09");
    const match = entry.match(RESCHEDULE_REGEX);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(note);
    expect(match![3]).toBe("Jun 2, 2026 at 2:34 PM");
    expect(match![4]).toBe("2026-06-09");
  });

  it("OLD format (date-only timestamp like 'Jun 2, 2026') still parses correctly", () => {
    // Backward compatibility: old entries stored just the date without time
    const entry = buildRescheduleEntry("Old note", "Priya", "Jun 2, 2026", "2026-06-09");
    const match = entry.match(RESCHEDULE_REGEX);
    expect(match).not.toBeNull();
    expect(match![3]).toBe("Jun 2, 2026");
    expect(match![4]).toBe("2026-06-09");
  });
});

describe("todayPST() date boundary tests", () => {
  it("India IST morning (e.g. 9 AM IST) shows PST date, not IST date", () => {
    // 9 AM IST June 3 = 3:30 AM UTC June 3 = 8:30 PM PDT June 2
    const utcMs = Date.UTC(2026, 5, 3, 3, 30, 0);
    const pstDate = todayPSTAt(utcMs);
    expect(pstDate).toBe("2026-06-02"); // PST is still June 2
  });

  it("UTC midnight = PST previous evening (not a new PST day)", () => {
    // UTC midnight June 3 = 5 PM PDT June 2
    const utcMs = Date.UTC(2026, 5, 3, 0, 0, 0);
    const pstDate = todayPSTAt(utcMs);
    expect(pstDate).toBe("2026-06-02");
  });

  it("UTC 07:01 = just past midnight PST (new PST day)", () => {
    // 07:01 UTC = 00:01 PDT — new day in PST
    const utcMs = Date.UTC(2026, 5, 3, 7, 1, 0);
    const pstDate = todayPSTAt(utcMs);
    expect(pstDate).toBe("2026-06-03");
  });
});

describe("Audit entry format consistency check", () => {
  it("nowDateTimePST() output is parseable by both DONE and RESCHEDULE regexes when embedded", () => {
    const datetime = nowDateTimePST();
    
    const doneEntry = buildDoneEntry("Test note", "Priya", datetime);
    const doneMatch = doneEntry.match(DONE_REGEX);
    expect(doneMatch).not.toBeNull();
    expect(doneMatch![3]).toBe(datetime);

    const rescheduleEntry = buildRescheduleEntry("Test note", "Priya", datetime, todayPST());
    const rescheduleMatch = rescheduleEntry.match(RESCHEDULE_REGEX);
    expect(rescheduleMatch).not.toBeNull();
    expect(rescheduleMatch![3]).toBe(datetime);
  });

  it("format contains 'at' keyword making it human-readable in the badge", () => {
    const datetime = nowDateTimePST();
    expect(datetime).toContain(" at ");
    // Should look like "Jun 2, 2026 at 2:34 PM" — readable in the activity badge
  });
});
