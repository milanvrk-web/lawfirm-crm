import { describe, expect, it, vi } from "vitest";
import type { Lead } from "@/lib/store";
import { normalizeLeadUpdateForApi, persistLeadConversion } from "@/lib/leadConversion";

const lead: Lead = {
  id: "lead-1",
  name: "Test Client",
  phone: "555-0100",
  email: "client@example.com",
  alienNumber: "",
  dateOfBirth: "",
  address: "",
  preferredLanguage: "English",
  caseType: "DA",
  caseNumber: "A-100",
  source: "Website (Calendly)",
  stage: "New Lead",
  notes: "",
  date: "2026-08-28",
  retainerBooked: 0,
  downpayment: 0,
  quotedAmount: 9000,
  referredBy: "",
  convertedDate: null,
  lostReason: null,
  lostReasonDetail: null,
  lostNote: null,
  lostDate: null,
  consultationFee: 0,
  consultationBookedDate: null,
  consultationScheduledFor: null,
  consultationFeeAppliedToRetainer: false,
  followUpDate: null,
  assignedTo: null,
};

describe("lead conversion persistence", () => {
  it("normalizes the consultation-fee adjustment flag for the numeric API field", () => {
    expect(normalizeLeadUpdateForApi({ consultationFeeAppliedToRetainer: true, stage: "Retained & Onboarding" })).toMatchObject({ consultationFeeAppliedToRetainer: 1 });
    expect(normalizeLeadUpdateForApi({ consultationFeeAppliedToRetainer: false, stage: "Retained & Onboarding" })).toMatchObject({ consultationFeeAppliedToRetainer: 0 });
  });
  it("awaits the Retained stage update before creating the downpayment", async () => {
    const events: string[] = [];
    const updateLead = vi.fn(async () => {
      events.push("lead-updated");
    });
    const addPayment = vi.fn(async () => {
      events.push("payment-created");
    });

    await persistLeadConversion({
      lead,
      form: { retainerBooked: "9000", downpayment: "2500", caseNumber: "A-101", notes: "Paid by card", applyConsultationFee: false },
      today: "2026-08-28",
      actorName: "Case Team",
      updateLead,
      addPayment,
    });

    expect(events).toEqual(["lead-updated", "payment-created"]);
    expect(updateLead).toHaveBeenCalledWith("lead-1", expect.objectContaining({
      stage: "Retained & Onboarding",
      retainerBooked: 9000,
      downpayment: 2500,
      caseNumber: "A-101",
      convertedDate: "2026-08-28",
    }));
    expect(addPayment).toHaveBeenCalledWith(expect.objectContaining({
      leadId: "lead-1",
      amount: 2500,
      receivedFor: "Retainer downpayment",
    }));
  });

  it("does not create a payment when no downpayment was received", async () => {
    const updateLead = vi.fn(async () => undefined);
    const addPayment = vi.fn(async () => undefined);

    await persistLeadConversion({
      lead,
      form: { retainerBooked: "9000", downpayment: "0", caseNumber: "", notes: "", applyConsultationFee: true },
      today: "2026-08-28",
      actorName: "Case Team",
      updateLead,
      addPayment,
    });

    expect(updateLead).toHaveBeenCalledWith("lead-1", expect.objectContaining({
      stage: "Retained & Onboarding",
      consultationFeeAppliedToRetainer: true,
    }));
    expect(addPayment).not.toHaveBeenCalled();
  });

  it("does not create a payment if the stage update fails", async () => {
    const updateLead = vi.fn(async () => { throw new Error("database unavailable"); });
    const addPayment = vi.fn(async () => undefined);

    await expect(persistLeadConversion({
      lead,
      form: { retainerBooked: "9000", downpayment: "2500", caseNumber: "", notes: "", applyConsultationFee: false },
      today: "2026-08-28",
      actorName: "Case Team",
      updateLead,
      addPayment,
    })).rejects.toThrow("database unavailable");
    expect(addPayment).not.toHaveBeenCalled();
  });
});
