import { describe, expect, it } from "vitest";
import { ROLE_OPTIONS } from "./Members";

describe("Members role options", () => {
  it("includes Admin for CRM team profiles", () => {
    expect(ROLE_OPTIONS).toContain("Admin");
  });
});
