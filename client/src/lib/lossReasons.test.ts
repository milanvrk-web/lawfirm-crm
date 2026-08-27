import { describe, expect, it } from "vitest";
import { LOSS_REASON_OPTIONS, formatLossReason, getLossReasonValidationMessage, isLossReasonComplete } from "./lossReasons";

describe("loss reason validation", () => {
  it("exposes all approved operational reasons", () => {
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

  it("requires a valid reason and non-empty supporting notes", () => {
    expect(isLossReasonComplete("", "", "")).toBe(false);
    expect(isLossReasonComplete("Client not reachable", "", "Reason")).toBe(false);
    expect(isLossReasonComplete("Client CNC not reachable", "", "")).toBe(false);
    expect(isLossReasonComplete("Client CNC not reachable", "", "Client stopped responding after three calls.")).toBe(true);
    expect(isLossReasonComplete("Case too complicated", "", "Attorney reviewed the facts and declined.")).toBe(true);
  });

  it("requires the requested case context when the firm does not provide the service", () => {
    expect(isLossReasonComplete("We don't provide that service", "", "Client requested asylum representation.")).toBe(false);
    expect(isLossReasonComplete("We don't provide that service", "Family-based case", "Client requested family petition help.")).toBe(true);
  });

  it("requires an explanation when an attorney declines the case", () => {
    expect(isLossReasonComplete("Attorney declined to take the case", "", "Attorney reviewed the facts.")).toBe(false);
    expect(isLossReasonComplete("Attorney declined to take the case", "Outside the firm's practice scope", "Attorney reviewed the facts.")).toBe(true);
  });

  it("returns an actionable note error when the reason is selected without notes", () => {
    expect(getLossReasonValidationMessage("Client is going with another attorney", "", "")).toBe("Additional notes are required to explain why this lead was lost.");
    expect(getLossReasonValidationMessage("Client is going with another attorney", "", "  ")).toBe("Additional notes are required to explain why this lead was lost.");
  });

  it("formats the operational reason and optional context for review", () => {
    expect(formatLossReason("We don't provide that service", "Family-based case")).toBe("We don't provide that service — Family-based case");
    expect(formatLossReason("Client denied the service due to high price", null)).toBe("Client denied the service due to high price");
  });
});
