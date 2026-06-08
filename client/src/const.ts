export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Self-hosted: the app uses an access-code gate (LockScreen), not OAuth.
 * getLoginUrl() returns "/" so any unauthorized redirect just goes home.
 */
export const getLoginUrl = (_returnPath?: string) => {
  return "/";
};
