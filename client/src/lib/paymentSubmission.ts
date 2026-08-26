import type { Payment } from "@/lib/store";

export type PaymentDraft = Omit<Payment, "id">;

export type PaymentPersistenceResult = "created" | "updated";

export async function persistPayment({
  editPaymentId,
  draft,
  addPayment,
  updatePayment,
}: {
  editPaymentId?: string;
  draft: PaymentDraft;
  addPayment: (payment: PaymentDraft) => Promise<void>;
  updatePayment: (id: string, payment: PaymentDraft) => Promise<void>;
}): Promise<PaymentPersistenceResult> {
  if (editPaymentId) {
    await updatePayment(editPaymentId, draft);
    return "updated";
  }

  await addPayment(draft);
  return "created";
}
