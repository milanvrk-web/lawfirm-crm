import type { Lead, Payment } from "@/lib/store";

export type ConversionForm = {
  retainerBooked: string;
  downpayment: string;
  caseNumber: string;
  notes: string;
  applyConsultationFee: boolean;
};

export function buildConversionLeadUpdate(
  lead: Lead,
  form: ConversionForm,
  today: string,
  actorName: string,
) {
  const retainerBooked = parseFloat(form.retainerBooked) || 0;
  const downpayment = parseFloat(form.downpayment) || 0;
  return {
    stage: "Retained & Onboarding",
    retainerBooked,
    downpayment,
    caseNumber: form.caseNumber || lead.caseNumber,
    convertedDate: today,
    consultationFeeAppliedToRetainer: form.applyConsultationFee,
    actorName,
  };
}

export function normalizeLeadUpdateForApi<T extends Record<string, unknown>>(updates: T): T {
  const normalized = { ...updates };
  const flag = normalized.consultationFeeAppliedToRetainer;
  if (typeof flag === "boolean") {
    (normalized as Record<string, unknown>).consultationFeeAppliedToRetainer = flag ? 1 : 0;
  }
  return normalized as T;
}

export async function persistLeadUpdate<T extends Record<string, unknown>>({
  leadId,
  updates,
  updateLead,
}: {
  leadId: string;
  updates: T;
  updateLead: (id: string, updates: T) => Promise<void>;
}): Promise<T> {
  await updateLead(leadId, updates);
  return updates;
}

export function buildConversionPayment(lead: Lead, form: ConversionForm, today: string): Omit<Payment, "id"> | null {
  const downpayment = parseFloat(form.downpayment) || 0;
  if (downpayment <= 0) return null;
  return {
    date: today,
    clientName: lead.name,
    leadId: lead.id,
    caseType: lead.caseType,
    caseNumber: form.caseNumber || lead.caseNumber,
    paymentType: "New Client",
    amount: downpayment,
    receivedFor: "Retainer downpayment",
    notes: form.notes,
  };
}

export async function persistLeadConversion({
  lead,
  form,
  today,
  actorName,
  updateLead,
  addPayment,
}: {
  lead: Lead;
  form: ConversionForm;
  today: string;
  actorName: string;
  updateLead: (id: string, updates: ReturnType<typeof buildConversionLeadUpdate>) => Promise<void>;
  addPayment: (payment: Omit<Payment, "id">) => Promise<void>;
}) {
  const leadUpdate = buildConversionLeadUpdate(lead, form, today, actorName);
  await updateLead(lead.id, leadUpdate);
  const payment = buildConversionPayment(lead, form, today);
  if (payment) await addPayment(payment);
  return leadUpdate;
}
