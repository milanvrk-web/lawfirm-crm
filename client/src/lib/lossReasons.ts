export const LOSS_REASON_OPTIONS = [
  "Client CNC not reachable",
  "Client denied the service due to high price",
  "Client said he doesn't need the service anymore",
  "Client is going with another attorney",
  "We don't provide that service",
  "Client unhappy with our customer support",
] as const;

export type LossReason = (typeof LOSS_REASON_OPTIONS)[number];
export const LOSS_REASON_DETAIL_REQUIRED = "We don't provide that service" as const;

export function isLossReasonComplete(reason: string, context: string): boolean {
  if (!LOSS_REASON_OPTIONS.includes(reason as LossReason)) return false;
  return reason !== LOSS_REASON_DETAIL_REQUIRED || context.trim().length > 0;
}

export function formatLossReason(reason: string | null | undefined, context?: string | null): string {
  if (!reason) return "Needs review";
  return context?.trim() ? `${reason} — ${context.trim()}` : reason;
}

export function getLossReasonDetailLabel(reason: string): string {
  return reason === LOSS_REASON_DETAIL_REQUIRED ? "What case was the client trying to hire for? *" : "";
}

export function getLossReasonDetailPlaceholder(reason: string): string {
  return reason === LOSS_REASON_DETAIL_REQUIRED ? "Describe the case or service requested..." : "";
}

export function shouldShowLossReasonDetail(reason: string): boolean {
  return reason === LOSS_REASON_DETAIL_REQUIRED;
}

export function getLossReasonDetailError(reason: string): string | null {
  return reason === LOSS_REASON_DETAIL_REQUIRED ? "Please specify what type of case the client was trying to hire us for." : null;
}

export function getLossReasonDetailPrompt(reason: string): string | null {
  return reason === LOSS_REASON_DETAIL_REQUIRED ? "Ask specifically what case was the client trying to hire for." : null;
}

export function getLossReasonContextRequirement(reason: string): "required" | "optional" {
  return reason === LOSS_REASON_DETAIL_REQUIRED ? "required" : "optional";
}

export function isLossReasonDetailRequired(reason: string): boolean {
  return reason === LOSS_REASON_DETAIL_REQUIRED;
}

export function getLossReasonValidationMessage(reason: string, context: string): string | null {
  if (!LOSS_REASON_OPTIONS.includes(reason as LossReason)) return "Select a valid Lost reason.";
  return isLossReasonComplete(reason, context) ? null : getLossReasonDetailError(reason);
}

export function getLossReasonSummary(reason: string, context: string): string {
  return formatLossReason(reason, context);
}
