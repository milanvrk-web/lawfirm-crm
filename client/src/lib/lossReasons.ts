export const LOSS_REASON_OPTIONS = [
  "Client not reachable",
  "Client declined the service",
  "Price too high",
  "Hired someone else",
  "Will take service later",
  "Service not needed anymore",
  "We couldn't provide the service",
  "Other",
] as const;

export type LossReason = typeof LOSS_REASON_OPTIONS[number];

export function isLossReasonComplete(reason: string, customReason: string): boolean {
  if (!LOSS_REASON_OPTIONS.includes(reason as LossReason)) return false;
  return reason !== "Other" || customReason.trim().length > 0;
}

export function formatLossReason(reason: string | null | undefined, detail: string | null | undefined): string {
  if (!reason) return "Needs review";
  return reason === "Other" && detail?.trim() ? `Other — ${detail.trim()}` : reason;
}
