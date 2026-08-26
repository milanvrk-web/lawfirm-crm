import { describe, expect, it, vi } from "vitest";
import { persistPayment, type PaymentDraft } from "./paymentSubmission";

const draft: PaymentDraft = {
  date: "2026-08-21",
  clientName: "Historical Test Client",
  leadId: undefined,
  caseType: "Other",
  caseNumber: "",
  paymentType: "New Client",
  amount: 1000,
  receivedFor: "Retainer downpayment",
  notes: "",
};

describe("persistPayment", () => {
  it("does not resolve a create as successful before the server mutation resolves", async () => {
    let resolveCreate!: () => void;
    const addPayment = vi.fn(() => new Promise<void>(resolve => { resolveCreate = resolve; }));
    const updatePayment = vi.fn().mockResolvedValue(undefined);
    const resultPromise = persistPayment({ draft, addPayment, updatePayment });

    let settled = false;
    void resultPromise.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(addPayment).toHaveBeenCalledWith(draft);

    resolveCreate();
    await expect(resultPromise).resolves.toBe("created");
  });

  it("propagates create failures so the form can remain open for correction or retry", async () => {
    const failure = new Error("Database unavailable");
    const addPayment = vi.fn().mockRejectedValue(failure);
    const updatePayment = vi.fn().mockResolvedValue(undefined);

    await expect(persistPayment({ draft, addPayment, updatePayment })).rejects.toBe(failure);
  });

  it("awaits and reports update persistence separately from create", async () => {
    const addPayment = vi.fn().mockResolvedValue(undefined);
    const updatePayment = vi.fn().mockResolvedValue(undefined);

    await expect(persistPayment({
      editPaymentId: "payment-1",
      draft,
      addPayment,
      updatePayment,
    })).resolves.toBe("updated");
    expect(updatePayment).toHaveBeenCalledWith("payment-1", draft);
    expect(addPayment).not.toHaveBeenCalled();
  });
});
