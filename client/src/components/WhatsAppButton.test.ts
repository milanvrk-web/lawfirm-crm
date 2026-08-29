import { describe, expect, it } from "vitest";
import { getWhatsAppUrl, normalizeWhatsAppPhone } from "./WhatsAppButton";

describe("WhatsApp contact links", () => {
  it("adds the default North American country code to a ten-digit CRM number", () => {
    expect(normalizeWhatsAppPhone("(669) 298-5127")).toBe("16692985127");
    expect(getWhatsAppUrl("(669) 298-5127")).toBe("https://wa.me/16692985127");
  });

  it("preserves an international number and removes formatting", () => {
    expect(normalizeWhatsAppPhone("+44 20 7946 0958")).toBe("442079460958");
    expect(normalizeWhatsAppPhone("0044 20 7946 0958")).toBe("442079460958");
  });

  it("returns null for missing or unusable phone values", () => {
    expect(normalizeWhatsAppPhone(null)).toBeNull();
    expect(normalizeWhatsAppPhone("not a phone number")).toBeNull();
    expect(getWhatsAppUrl("12345")).toBeNull();
  });
});
