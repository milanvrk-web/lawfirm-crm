import { describe, expect, it } from "vitest";
import { getLeadSourceGuidance, LEAD_SOURCE_OPTIONS, suggestLeadSourceCategory } from "./leadSources";

describe("lead source categories", () => {
  it("includes AI Tools, Email, and Calendly as reportable categories", () => {
    expect(LEAD_SOURCE_OPTIONS).toEqual(expect.arrayContaining(["AI Tools", "Email", "Calendly"]));
  });

  it("maps common AI tool names to AI Tools", () => {
    expect(suggestLeadSourceCategory("ChatGPT inquiry")).toBe("AI Tools");
    expect(suggestLeadSourceCategory("Claude")).toBe("AI Tools");
  });

  it("maps Calendly mentions to Calendly", () => {
    expect(suggestLeadSourceCategory("Calendly booking")).toBe("Calendly");
  });

  it("reminds staff to check existing categories when Other is selected", () => {
    expect(getLeadSourceGuidance("", "Other")).toContain("Check the existing source categories first");
    expect(getLeadSourceGuidance("Calendly", "Other")).toContain("select Calendly instead of Other");
  });

  it("warns when custom text resembles an existing category", () => {
    expect(getLeadSourceGuidance("email inquiry", "Other")).toContain("Email");
    expect(getLeadSourceGuidance("Google search", "Other")).toContain("Google");
  });
});
