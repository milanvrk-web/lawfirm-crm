import { describe, expect, it } from "vitest";
import { getChangedClientFields, hydrateLeadFromNotes } from "./clientRecord";

describe("client master-field comparison", () => {
  it("returns no changes for equivalent values despite null and empty-string differences", () => {
    expect(getChangedClientFields(
      { name: "Sukhbir Singh", phone: "+1 (347) 978-1561", email: "" },
      { name: "Sukhbir Singh", phone: "+1 (347) 978-1561", email: undefined },
    )).toEqual([]);
  });

  it("identifies only the edited master fields", () => {
    expect(getChangedClientFields(
      { name: "Sukhbir Singh", phone: "+1 (347) 978-1561", email: "old@example.com" },
      { name: "Sukhbir Singh", phone: "+1 (347) 917-0000", email: "new@example.com" },
    )).toEqual(["phone", "email"]);
  });

  it("supports a restricted field set for payment-entry confirmations", () => {
    expect(getChangedClientFields(
      { name: "Sukhbir Singh", caseType: "DA", caseNumber: "409", phone: "old" },
      { name: "Sukhbir Singh", caseType: "DA", caseNumber: "410" },
      ["name", "caseType", "caseNumber"],
    )).toEqual(["caseNumber"]);
  });

  it("hydrates common legacy intake labels from notes without mutating the source object", () => {
    const source = {
      name: "Jyoti",
      phone: "+1(765)298-9507",
      email: "j75066829@gmail.com",
      caseType: "DA",
      caseNumber: "",
      alienNumber: "",
      dateOfBirth: "",
      address: "",
      preferredLanguage: "",
      source: "Existing Client",
      referredBy: "",
      notes: "A# 236 278 583\nDOB: 2nd August, 1994\nCurrent Address: Oakdale, California\nLead Source/Referred By: Simran",
    };
    const hydrated = hydrateLeadFromNotes(source);
    expect(hydrated.alienNumber).toBe("236-278-583");
    expect(hydrated.dateOfBirth).toBe("1994-08-02");
    expect(hydrated.address).toBe("Oakdale, California");
    expect(hydrated.referredBy).toBe("Simran");
    expect(source.alienNumber).toBe("");
  });
});
