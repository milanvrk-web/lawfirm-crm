import { describe, expect, it } from "vitest";
import { LOSS_REASON_OPTIONS, formatLossReason, isLossReasonComplete } from "./lossReasons";

describe("loss reason validation", () => {
  it("exposes the six approved operational reasons", () => {
    expect(LOSS_REASON_OPTIONS).toEqual([
      "Client CNC not reachable",
      "Client denied the service due to high price",
      "Client said he doesn't need the service anymore",
      "Client is going with another attorney",
      "We don't provide that service",
      "Client unhappy with our customer support",
      "Case too complicated",
      "Attorney declined to take the case",
    ]);
  });

  it("requires a valid reason but does not require a general note", () => {
    expect(isLossReasonComplete("", "")).toBe(false);
    expect(isLossReasonComplete("Client not reachable", "")).toBe(false);
    expect(isLossReasonComplete("Client CNC not reachable", "")).toBe(true);
    expect(isLossReasonComplete("Client unhappy with our customer support", "")).toBe(true);
    expect(isLossReasonComplete("Case too complicated", "")).toBe(true);
  });

  it("requires the requested case context when the firm does not provide the service", () => {
    expect(isLossReasonComplete("We don't provide that service", "")).toBe(false);
    expect(isLossReasonComplete("We don't provide that service", "Family-based case")).toBe(true);
  });

  it("requires an explanation when an attorney declines the case", () => {
    expect(isLossReasonComplete("Attorney declined to take the case", "")).toBe(false);
    expect(isLossReasonComplete("Attorney declined to take the case", "Outside the firm's practice scope")).toBe(true);
  });

  it("formats the operational reason and optional context for review", () => {
    expect(formatLossReason("We don't provide that service", "Family-based case")).toBe("We don't provide that service — Family-based case");
    expect(formatLossReason("Client denied the service due to high price", null)).toBe("Client denied the service due to high price");
  });
});
