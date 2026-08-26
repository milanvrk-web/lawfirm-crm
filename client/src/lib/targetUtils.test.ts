import { describe, expect, it } from "vitest";
import type { Targets } from "@/lib/store";
import { targetsEqual } from "@/lib/targetUtils";

const baseTargets: Targets = {
  monthly: { green: 125000, yellow: 100000 },
  weekly: { green: 31250, yellow: 25000 },
};

describe("targetsEqual", () => {
  it("treats separately-created equivalent objects as equal", () => {
    expect(targetsEqual(baseTargets, {
      monthly: { ...baseTargets.monthly },
      weekly: { ...baseTargets.weekly },
    })).toBe(true);
  });

  it("detects a changed monthly or weekly threshold", () => {
    expect(targetsEqual(baseTargets, {
      ...baseTargets,
      monthly: { ...baseTargets.monthly, green: 130000 },
    })).toBe(false);
    expect(targetsEqual(baseTargets, {
      ...baseTargets,
      weekly: { ...baseTargets.weekly, yellow: 26000 },
    })).toBe(false);
  });
});
