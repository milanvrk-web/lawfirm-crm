import { describe, expect, it } from "vitest";
import {
  CLIENT_DOES_NOT_NEED_SERVICE_REASON,
  CLIENT_DOES_NOT_WANT_TO_PAY_REASON,
  LEGACY_HIGH_PRICE_REASON,
  LEGACY_NO_SERVICE_NEEDED_REASON,
  LOSS_REASON_OPTIONS,
  PAYMENT_REFUSAL_SUBREASONS,
  formatLossReason,
  getLossReasonValidationMessage,
  isLossReasonComplete,
  normalizeLossReason,
} from "./lossReasons";

describe("loss reason validation", () => {
  it("exposes the payment-refusal category and all approved sub-reasons", () => {
    expect(LOSS_REASON_OPTIONS).toContain(CLIENT_DOES_NOT_WANT_TO_PAY_REASON);
    expect(PAYMENT_REFUSAL_SUBREASONS).toEqual([
      "Client denied paying the consultation fee",
      "Client said the price is too high",
      "Client said he doesn't have money",
    ]);
  });

  it("requires a payment-refusal sub-reason and notes", () => {
    expect(isLossReasonComplete(CLIENT_DOES_NOT_WANT_TO_PAY_REASON, "", "Client refused to pay.")).toBe(false);
    expect(isLossReasonComplete(CLIENT_DOES_NOT_WANT_TO_PAY_REASON, PAYMENT_REFUSAL_SUBREASONS[0], "")).toBe(false);
    expect(isLossReasonComplete(CLIENT_DOES_NOT_WANT_TO_PAY_REASON, PAYMENT_REFUSAL_SUBREASONS[0], "Client requested a free consultation.")).toBe(true);
    expect(getLossReasonValidationMessage(CLIENT_DOES_NOT_WANT_TO_PAY_REASON, "", "Client refused to pay.")).toBe("Select a payment refusal reason before continuing.");
  });

  it("uses the shorter no-service-needed label and normalizes legacy labels", () => {
    expect(LOSS_REASON_OPTIONS).toContain(CLIENT_DOES_NOT_NEED_SERVICE_REASON);
    expect(normalizeLossReason(LEGACY_NO_SERVICE_NEEDED_REASON)).toBe(CLIENT_DOES_NOT_NEED_SERVICE_REASON);
    expect(formatLossReason(LEGACY_NO_SERVICE_NEEDED_REASON)).toBe(CLIENT_DOES_NOT_NEED_SERVICE_REASON);
    expect(isLossReasonComplete(LEGACY_NO_SERVICE_NEEDED_REASON, "", "Client called for a general query only.")).toBe(true);
  });

  it("normalizes the legacy high-price reason into the payment-refusal category", () => {
    expect(normalizeLossReason(LEGACY_HIGH_PRICE_REASON)).toBe(CLIENT_DOES_NOT_WANT_TO_PAY_REASON);
    expect(formatLossReason(LEGACY_HIGH_PRICE_REASON, PAYMENT_REFUSAL_SUBREASONS[1])).toBe(`${CLIENT_DOES_NOT_WANT_TO_PAY_REASON} — ${PAYMENT_REFUSAL_SUBREASONS[1]}`);
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
    expect(formatLossReason("Client denied the service due to high price", null)).toBe("Client doesn't want to pay");
  });
});
