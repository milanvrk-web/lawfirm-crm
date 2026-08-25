import { describe, expect, it } from "vitest";
import { isLossReasonComplete } from "./lossReasons";

describe("loss reason validation", () => {
  it("requires a standardized reason and supporting note", () => {
    expect(isLossReasonComplete("", "", "Called twice")).toBe(false);
    expect(isLossReasonComplete("No response", "", "")).toBe(false);
    expect(isLossReasonComplete("No response", "", "No reply after three attempts")).toBe(true);
  });

  it("requires detail when Other is selected", () => {
    expect(isLossReasonComplete("Other", "", "Client situation is unique")).toBe(false);
    expect(isLossReasonComplete("Other", "Visa ineligibility", "Client situation is unique")).toBe(true);
  });
});
