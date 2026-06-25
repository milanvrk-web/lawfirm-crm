export const COOKIE_NAME = "app_session_id";

/**
 * Stages that represent a converted client — no longer an active lead.
 * These stages come AFTER the lead has signed a retainer.
 * Any lead in these stages should be excluded from active lead counts,
 * pipeline value calculations, and stale lead checks.
 */
export const CONVERTED_STAGES = ["Retained", "Onboarding"] as const;
export type ConvertedStage = typeof CONVERTED_STAGES[number];

/** Check if a stage is a post-conversion stage (client, not lead) */
export function isConvertedStage(stage: string): boolean {
  return CONVERTED_STAGES.includes(stage as ConvertedStage);
}
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
