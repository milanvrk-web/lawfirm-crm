export const LOSS_REASON_OPTIONS = [
  "Price too high",
  "Chose competitor",
  "Not qualified",
  "No response",
  "Changed mind",
  "Other",
] as const;

export function isLossReasonComplete(reason: string, customReason: string, note: string): boolean {
  if (!reason.trim() || !note.trim()) return false;
  return reason !== "Other" || customReason.trim().length > 0;
}
