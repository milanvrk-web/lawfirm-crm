export const LEGACY_NO_SERVICE_NEEDED_REASON = "Client said he doesn't need the service anymore" as const;
export const CLIENT_DOES_NOT_NEED_SERVICE_REASON = "Client doesn't need the service" as const;
export const LEGACY_HIGH_PRICE_REASON = "Client denied the service due to high price" as const;
export const CLIENT_DOES_NOT_WANT_TO_PAY_REASON = "Client doesn't want to pay" as const;

export const PAYMENT_REFUSAL_SUBREASONS = [
  "Client denied paying the consultation fee",
  "Client said the price is too high",
  "Client said he doesn't have money",
] as const;

export type PaymentRefusalSubreason = (typeof PAYMENT_REFUSAL_SUBREASONS)[number];

export const LOSS_REASON_OPTIONS = [
  "Client CNC not reachable",
  CLIENT_DOES_NOT_WANT_TO_PAY_REASON,
  CLIENT_DOES_NOT_NEED_SERVICE_REASON,
  "Client is going with another attorney",
  "We don't provide that service",
  "Client unhappy with our customer support",
  "Case too complicated",
  "Attorney declined to take the case",
] as const;

export type LossReason = (typeof LOSS_REASON_OPTIONS)[number];
export const LOSS_REASON_DETAIL_REQUIRED = "We don't provide that service" as const;
export const LOSS_REASON_ATTORNEY_DETAIL_REQUIRED = "Attorney declined to take the case" as const;

export function normalizeLossReason(reason: string): string {
  if (reason === LEGACY_NO_SERVICE_NEEDED_REASON) return CLIENT_DOES_NOT_NEED_SERVICE_REASON;
  if (reason === LEGACY_HIGH_PRICE_REASON) return CLIENT_DOES_NOT_WANT_TO_PAY_REASON;
  return reason;
}

export function isPaymentRefusalReason(reason: string): boolean {
  return normalizeLossReason(reason) === CLIENT_DOES_NOT_WANT_TO_PAY_REASON;
}

export function isPaymentRefusalSubreason(value: string): value is PaymentRefusalSubreason {
  return PAYMENT_REFUSAL_SUBREASONS.includes(value as PaymentRefusalSubreason);
}

export function isLossReasonComplete(reason: string, context: string, note = ""): boolean {
  const normalizedReason = normalizeLossReason(reason);
  if (!LOSS_REASON_OPTIONS.includes(normalizedReason as LossReason)) return false;
  if (!note.trim()) return false;
  if (isPaymentRefusalReason(normalizedReason)) return isPaymentRefusalSubreason(context);
  return !([LOSS_REASON_DETAIL_REQUIRED, LOSS_REASON_ATTORNEY_DETAIL_REQUIRED] as readonly string[]).includes(normalizedReason) || context.trim().length > 0;
}

export function formatLossReason(reason: string | null | undefined, context?: string | null): string {
  if (!reason) return "Needs review";
  const normalizedReason = normalizeLossReason(reason);
  return context?.trim() ? `${normalizedReason} — ${context.trim()}` : normalizedReason;
}

export function getLossReasonDetailLabel(reason: string): string {
  const normalizedReason = normalizeLossReason(reason);
  if (isPaymentRefusalReason(normalizedReason)) return "Why didn't the client want to pay? *";
  if (normalizedReason === LOSS_REASON_DETAIL_REQUIRED) return "What case was the client trying to hire for? *";
  if (normalizedReason === LOSS_REASON_ATTORNEY_DETAIL_REQUIRED) return "Why did the attorney decline to take the case? *";
  return "";
}

export function getLossReasonDetailPlaceholder(reason: string): string {
  const normalizedReason = normalizeLossReason(reason);
  if (isPaymentRefusalReason(normalizedReason)) return "Select a payment refusal reason...";
  if (normalizedReason === LOSS_REASON_DETAIL_REQUIRED) return "Describe the case or service requested...";
  if (normalizedReason === LOSS_REASON_ATTORNEY_DETAIL_REQUIRED) return "Explain why the attorney declined...";
  return "";
}

export function shouldShowLossReasonDetail(reason: string): boolean {
  const normalizedReason = normalizeLossReason(reason);
  return isPaymentRefusalReason(normalizedReason)
    || ([LOSS_REASON_DETAIL_REQUIRED, LOSS_REASON_ATTORNEY_DETAIL_REQUIRED] as readonly string[]).includes(normalizedReason);
}

export function getLossReasonDetailError(reason: string): string | null {
  const normalizedReason = normalizeLossReason(reason);
  if (isPaymentRefusalReason(normalizedReason)) return "Select a payment refusal reason before continuing.";
  if (normalizedReason === LOSS_REASON_DETAIL_REQUIRED) return "Please specify what type of case the client was trying to hire us for.";
  if (normalizedReason === LOSS_REASON_ATTORNEY_DETAIL_REQUIRED) return "Please explain why the attorney declined to take the case.";
  return null;
}

export function getLossReasonDetailPrompt(reason: string): string | null {
  const normalizedReason = normalizeLossReason(reason);
  if (isPaymentRefusalReason(normalizedReason)) return "Choose the specific payment-related reason before saving.";
  if (normalizedReason === LOSS_REASON_DETAIL_REQUIRED) return "Ask specifically what case was the client trying to hire for.";
  if (normalizedReason === LOSS_REASON_ATTORNEY_DETAIL_REQUIRED) return "Record why the attorney declined to take the case.";
  return null;
}

export function getLossReasonContextRequirement(reason: string): "required" | "optional" {
  return shouldShowLossReasonDetail(reason) ? "required" : "optional";
}

export function isLossReasonDetailRequired(reason: string): boolean {
  return shouldShowLossReasonDetail(reason);
}

export function getLossReasonValidationMessage(reason: string, context: string, note = ""): string | null {
  const normalizedReason = normalizeLossReason(reason);
  if (!LOSS_REASON_OPTIONS.includes(normalizedReason as LossReason)) return "Select a valid Lost reason.";
  if (!note.trim()) return "Additional notes are required to explain why this lead was lost.";
  if (isPaymentRefusalReason(normalizedReason) && !isPaymentRefusalSubreason(context)) return getLossReasonDetailError(normalizedReason);
  return getLossReasonDetailError(normalizedReason) && !context.trim() ? getLossReasonDetailError(normalizedReason) : null;
}

export function getLossReasonSummary(reason: string, context: string): string {
  return formatLossReason(reason, context);
}
