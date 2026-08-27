import { describe, expect, it } from "vitest";
import { getLeadSourceGuidance, LEAD_SOURCE_OPTIONS, suggestLeadSourceCategory } from "./leadSources";

describe("lead source taxonomy", () => {
  it("includes the standardized Website, combined social, AI Tools, and Email categories", () => {
    expect(LEAD_SOURCE_OPTIONS).toEqual(expect.arrayContaining([
      "Website (Calendly)",
      "Facebook / Instagram",
      "AI Tools (ChatGPT, Claude, etc.)",
      "Email",
    ]));
    expect(LEAD_SOURCE_OPTIONS).not.toContain("Facebook");
    expect(LEAD_SOURCE_OPTIONS).not.toContain("Instagram");
    expect(LEAD_SOURCE_OPTIONS).not.toContain("Calendly");
  });

  it("classifies Calendly as the Website scheduling source", () => {
    expect(suggestLeadSourceCategory("Calendly booking")).toBe("Website (Calendly)");
    expect(getLeadSourceGuidance("Calendly", "Other")).toContain("Website");
  });

  it("classifies ChatGPT and Claude under the explicit AI Tools category", () => {
    expect(suggestLeadSourceCategory("ChatGPT inquiry")).toBe("AI Tools (ChatGPT, Claude, etc.)");
    expect(suggestLeadSourceCategory("Claude")).toBe("AI Tools (ChatGPT, Claude, etc.)");
    expect(getLeadSourceGuidance("ChatGPT", "Other")).toContain("AI Tools (ChatGPT, Claude, etc.)");
  });

  it("combines Facebook and Instagram into one reporting category", () => {
    expect(suggestLeadSourceCategory("Facebook message")).toBe("Facebook / Instagram");
    expect(suggestLeadSourceCategory("Instagram DM")).toBe("Facebook / Instagram");
  });

  it("keeps Other as a genuinely new-source fallback", () => {
    expect(getLeadSourceGuidance("", "Other")).toContain("Check the existing source categories first");
    expect(getLeadSourceGuidance("local community event", "Other")).toBeNull();
  });
});
