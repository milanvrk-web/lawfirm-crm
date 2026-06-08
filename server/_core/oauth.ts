import type { Express } from "express";

/**
 * OAuth routes — no-op outside Manus.
 * The CRM uses an access-code gate (LockScreen) instead of user OAuth.
 * This stub keeps the import in server/_core/index.ts working without changes.
 */
export function registerOAuthRoutes(_app: Express) {
  // No OAuth routes needed for self-hosted deployment.
  // Authentication is handled via the ACCESS_CODE environment variable
  // and the LockScreen component on the frontend.
}
