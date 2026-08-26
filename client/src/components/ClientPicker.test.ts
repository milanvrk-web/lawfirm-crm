import { describe, expect, it } from "vitest";
import { matchesLead, normalizeSearch } from "./ClientPicker";
import type { Lead } from "@/lib/store";

const lead: Lead = {
  id: "lead-1",
  name: "Sukhbir Singh",
  phone: "+1 (347) 978-1561",
  email: "sukhbir@example.com",
  alienNumber: "A# 215-123-456",
  dateOfBirth: "1988-06-12",
  address: "12 Main Street, Queens, NY 11373",
  preferredLanguage: "Punjabi",
  caseType: "DA",
  caseNumber: "409",
  source: "Referral",
  stage: "Retained & Onboarding",
  notes: "Existing intake details",
  date: "2026-08-20",
  retainerBooked: 8000,
  downpayment: 2000,
  quotedAmount: 8000,
  referredBy: "Harjit",
};

describe("ClientPicker matching", () => {
  it("normalizes punctuation and spacing", () => {
    expect(normalizeSearch("+1 (347) 978-1561")).toBe("13479781561");
  });

  it("finds a record by partial phone number", () => {
    expect(matchesLead(lead, "347 978")).toBe(true);
  });

  it("finds a record by partial A-number", () => {
    expect(matchesLead(lead, "215 123")).toBe(true);
  });

  it("finds a record by name and email", () => {
    expect(matchesLead(lead, "sukhbir singh")).toBe(true);
    expect(matchesLead(lead, "sukhbir@example")).toBe(true);
  });

  it("does not raise a false match for a genuinely new person", () => {
    expect(matchesLead(lead, "Amandeep New Person")).toBe(false);
  });
});
