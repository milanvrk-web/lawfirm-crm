import { describe, expect, it } from "vitest";
import { getMonthlyLeadCohort, getMonthlyLifecycleLeads, getMonthlyRevenue, getLostReasonRows, getSourceFunnelRows } from "./dashboardMetrics";
import type { Lead, Payment } from "./store";

const lead = (overrides: Partial<Lead>): Lead => ({
  id: "l1", name: "Test Lead", phone: "", email: "", alienNumber: "", dateOfBirth: "", address: "", preferredLanguage: "",
  caseType: "DA", caseNumber: "", source: "Google", stage: "New Lead", notes: "", date: "2026-08-10",
  retainerBooked: 0, downpayment: 0, quotedAmount: 0, referredBy: "", consultationFee: 0, assignedTo: null, followUpDate: "", ...overrides,
});
const payment = (overrides: Partial<Payment>): Payment => ({
  id: "p1", clientName: "Test Lead", leadId: "l1", date: "2026-08-10", amount: 100,
  paymentType: "New Client", receivedFor: "Retainer", caseType: "DA", caseNumber: "", notes: "", ...overrides,
});

describe("dashboard monthly metrics", () => {
  it("uses payment business dates and separates new, existing, and consultation revenue", () => {
    const revenue = getMonthlyRevenue([
      payment({ amount: 150, receivedFor: "Consultation Fee" }),
      payment({ id: "p2", amount: 1000, paymentType: "Existing Client", caseType: "AOS" }),
      payment({ id: "p3", date: "2026-07-31", amount: 500 }),
    ]);
    expect(revenue).toEqual({ newClient: 650, existingClient: 1000, total: 1650, consultation: 150 });
  });

  it("keeps July and August lead cohorts separate by lead business date", () => {
    const leads = [lead({ id: "july", date: "2026-07-31" }), lead({ id: "aug", date: "2026-08-01" })];
    expect(getMonthlyLeadCohort(leads, 2026, 7).map(item => item.id)).toEqual(["july"]);
    expect(getMonthlyLeadCohort(leads, 2026, 8).map(item => item.id)).toEqual(["aug"]);
  });

  it("keeps conversion and loss outcomes inside the selected lead-entry cohort", () => {
    const leads = [
      lead({ id: "july-converted", date: "2026-07-01", convertedDate: "2026-08-03", stage: "Retained & Onboarding" }),
      lead({ id: "july-lost", date: "2026-07-05", lostDate: "2026-08-06", stage: "Lost", lostReason: "Client doesn’t need the service" }),
      lead({ id: "aug-converted", date: "2026-08-07", stage: "Retained & Onboarding" }),
      lead({ id: "aug-lost", date: "2026-08-08", stage: "Lost", lostReason: "Client CNC not reachable" }),
    ];
    const lifecycle = getMonthlyLifecycleLeads(leads, 2026, 8);
    expect(lifecycle.converted.map(item => item.id)).toEqual(["aug-converted"]);
    expect(lifecycle.lost.map(item => item.id)).toEqual(["aug-lost"]);
    expect(getLostReasonRows(leads, 2026, 8)).toEqual([{ reason: "Client CNC not reachable", leadIds: ["aug-lost"], count: 1 }]);
  });

  it("attributes linked monthly payments to canonical source rows without retainer double-counting", () => {
    const leads = [lead({ id: "l1", source: "Calendly booking" }), lead({ id: "l2", source: "Instagram DM", stage: "Retained & Onboarding" })];
    const payments = [payment({ leadId: "l1", amount: 150, receivedFor: "Consultation Fee" }), payment({ id: "p2", leadId: "l2", amount: 900, paymentType: "Existing Client" })];
    const rows = getSourceFunnelRows(leads, payments, 2026, 8);
    expect(rows.map(row => [row.source, row.totalReceived])).toEqual([["Facebook / Instagram", 900], ["Website (Calendly)", 150]]);
    expect(rows.find(row => row.source === "Website (Calendly)")?.newClientRevenue).toBe(150);
  });
});
