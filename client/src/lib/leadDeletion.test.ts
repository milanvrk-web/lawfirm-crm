import { describe, expect, it, vi } from "vitest";
import { deleteAfterConfirmation } from "./leadDeletion";

describe("deleteAfterConfirmation", () => {
  it("does not invoke deletion when no lead has been confirmed", async () => {
    const removeLead = vi.fn();

    await expect(deleteAfterConfirmation(null, removeLead)).resolves.toBeNull();
    expect(removeLead).not.toHaveBeenCalled();
  });

  it("deletes only the selected lead and returns its name for UI feedback", async () => {
    const removeLead = vi.fn().mockResolvedValue(undefined);

    await expect(deleteAfterConfirmation({ id: "lead-42", name: "Test Client" }, removeLead)).resolves.toBe("Test Client");
    expect(removeLead).toHaveBeenCalledTimes(1);
    expect(removeLead).toHaveBeenCalledWith("lead-42");
  });
});
