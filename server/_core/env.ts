export const ENV = {
  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Session security
  cookieSecret: process.env.JWT_SECRET ?? "",
  // CRM access code (passphrase shown on lock screen)
  accessCode: process.env.ACCESS_CODE ?? "",
  // AI — Groq API key for LLM features (briefings, lead analysis)
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  // Runtime
  isProduction: process.env.NODE_ENV === "production",
  // Legacy Manus fields — kept for backward compat but not required outside Manus
  appId: process.env.VITE_APP_ID ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
