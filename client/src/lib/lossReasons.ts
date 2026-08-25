export const LOSS_REASON_OPTIONS = [
  "Client CNC not reachable",
  "Client denied the service due to high price",
  "Client said he doesn't need the service anymore",
  "Client is going with another attorney",
  "We don't provide that service",
  "Client unhappy with our customer support",
  "Case too complicated",
  "Attorney declined to take the case",
] as const;

export type LossReason = (typeof LOSS_REASON_OPTIONS)[number];
export const LOSS_REASON_DETAIL_REQUIRED = "We don't provide that service" as const;
export const LOSS_REASON_ATTORNEY_DETAIL_REQUIRED = "Attorney declined to take the case" as const;

export function isLossReasonComplete(reason: string, context: string): boolean {
  if (!LOSS_REASON_OPTIONS.includes(reason as LossReason)) return false;
  return !([LOSS_REASON_DETAIL_REQUIRED, LOSS_REASON_ATTORNEY_DETAIL_REQUIRED] as readonly string[]).includes(reason) || context.trim().length > 0;
}

export function formatLossReason(reason: string | null | undefined, context?: string | null): string {
  if (!reason) return "Needs review";
  return context?.trim() ? `${reason} — ${context.trim()}` : reason;
}

export function getLossReasonDetailLabel(reason: string): string {
  if (reason === LOSS_REASON_DETAIL_REQUIRED) return "What case was the client trying to hire for? *";
  if (reason === LOSS_REASON_ATTORNEY_DETAIL_REQUIRED) return "Why did the attorney decline to take the case? *";
  return "";
}

export function getLossReasonDetailPlaceholder(reason: string): string {
  if (reason === LOSS_REASON_DETAIL_REQUIRED) return "Describe the case or service requested...";
  if (reason === LOSS_REASON_ATTORNEY_DETAIL_REQUIRED) return "Explain why the attorney declined...";
  return "";
}

export function shouldShowLossReasonDetail(reason: string): boolean {
  return ([LOSS_REASON_DETAIL_REQUIRED, LOSS_REASON_ATTORNEY_DETAIL_REQUIRED] as readonly string[]).includes(reason);
}

export function getLossReasonDetailError(reason: string): string | null {
  if (reason === LOSS_REASON_DETAIL_REQUIRED) return "Please specify what type of case the client was trying to hire us for.";
  if (reason === LOSS_REASON_ATTORNEY_DETAIL_REQUIRED) return "Please explain why the attorney declined to take the case.";
  return null;
}

export function getLossReasonDetailPrompt(reason: string): string | null {
  if (reason === LOSS_REASON_DETAIL_REQUIRED) return "Ask specifically what case was the client trying to hire for.";
  if (reason === LOSS_REASON_ATTORNEY_DETAIL_REQUIRED) return "Record why the attorney declined to take the case.";
  return null;
}

export function getLossReasonContextRequirement(reason: string): "required" | "optional" {
  return ([LOSS_REASON_DETAIL_REQUIRED, LOSS_REASON_ATTORNEY_DETAIL_REQUIRED] as readonly string[]).includes(reason) ? "required" : "optional";
}

export function isLossReasonDetailRequired(reason: string): boolean {
  return ([LOSS_REASON_DETAIL_REQUIRED, LOSS_REASON_ATTORNEY_DETAIL_REQUIRED] as readonly string[]).includes(reason);
}

export function getLossReasonValidationMessage(reason: string, context: string): string | null {
  if (!LOSS_REASON_OPTIONS.includes(reason as LossReason)) return "Select a valid Lost reason.";
  return isLossReasonComplete(reason, context) ? null : getLossReasonDetailError(reason);
}

export function getLossReasonSummary(reason: string, context: string): string {
  return formatLossReason(reason, context);
}
