import { describe, expect, it } from "vitest";
import { formatLossReason, isLossReasonComplete } from "./lossReasons";

describe("loss reason validation", () => {
  it("requires one of the approved standardized reasons but does not require a note", () => {
    expect(isLossReasonComplete("", "")).toBe(false);
    expect(isLossReasonComplete("No response", "")).toBe(false);
    expect(isLossReasonComplete("Client not reachable", "")).toBe(true);
    expect(isLossReasonComplete("Price too high", "")).toBe(true);
  });

  it("requires detail when Other is selected", () => {
    expect(isLossReasonComplete("Other", "")).toBe(false);
    expect(isLossReasonComplete("Other", "Visa ineligibility")).toBe(true);
  });

  it("formats Other with its required detail for user-facing review", () => {
    expect(formatLossReason("Other", "Matter is outside our practice scope")).toBe("Other — Matter is outside our practice scope");
    expect(formatLossReason("Client declined the service", null)).toBe("Client declined the service");
  });
});
