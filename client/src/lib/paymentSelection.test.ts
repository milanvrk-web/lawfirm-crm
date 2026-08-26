import { describe, expect, it } from "vitest";
import { paymentSelectionMatches } from "@/lib/paymentSelection";

describe("paymentSelectionMatches", () => {
  it("recognizes an unchanged empty payment selection", () => {
    expect(paymentSelectionMatches(new Set(), [])).toBe(true);
  });

  it("recognizes the same selected IDs regardless of their source order", () => {
    expect(paymentSelectionMatches(new Set(["p-1", "p-2"]), ["p-2", "p-1"])).toBe(true);
  });

  it("detects a changed linked-payment selection", () => {
    expect(paymentSelectionMatches(new Set(["p-1"]), ["p-1", "p-2"])).toBe(false);
  });
});
