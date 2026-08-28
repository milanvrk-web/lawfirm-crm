import { describe, expect, it } from "vitest";
import { getPipelineRange } from "./leadPipelineRange";

describe("getPipelineRange", () => {
  const base = { year: 2026, month: 8, weekDate: "2026-08-19", customStart: "2026-08-01", customEnd: "2026-08-21" };

  it("returns the complete selected month", () => {
    expect(getPipelineRange({ ...base, mode: "month" })).toMatchObject({ start: "2026-08-01", end: "2026-08-31" });
  });

  it("returns a Monday-to-Sunday week containing the selected date", () => {
    expect(getPipelineRange({ ...base, mode: "week", weekDate: "2026-08-19" })).toMatchObject({ start: "2026-08-17", end: "2026-08-23" });
  });

  it("returns the exact inclusive custom range", () => {
    expect(getPipelineRange({ ...base, mode: "custom" })).toMatchObject({ start: "2026-08-01", end: "2026-08-21" });
  });
});
