export const LEAD_SOURCE_OPTIONS = [
  "Referral",
  "Existing Client",
  "Google",
  "Facebook / Instagram",
  "Website",
  "Walk-In",
  "Handler",
  "AI Tools (ChatGPT, Claude, etc.)",
  "Email",
  "Other",
] as const;

export type LeadSourceCategory = (typeof LEAD_SOURCE_OPTIONS)[number];

const aliases: Array<{ category: LeadSourceCategory; terms: string[] }> = [
  { category: "Website", terms: ["calendly", "calendar link", "booking link", "appointment link", "website", "web site", "online form"] },
  { category: "AI Tools (ChatGPT, Claude, etc.)", terms: ["chatgpt", "chat gpt", "claude", "gemini", "copilot", "perplexity", "ai tool", "artificial intelligence"] },
  { category: "Email", terms: ["email", "e-mail", "mail inquiry", "email inquiry"] },
  { category: "Referral", terms: ["referral", "referred", "friend referral", "word of mouth"] },
  { category: "Existing Client", terms: ["existing client", "past client", "former client"] },
  { category: "Google", terms: ["google", "google search", "google maps"] },
  { category: "Facebook / Instagram", terms: ["facebook", "fb", "instagram", "ig"] },
  { category: "Walk-In", terms: ["walk in", "walk-in", "walkin"] },
  { category: "Handler", terms: ["handler"] },
];

export function suggestLeadSourceCategory(value: string): LeadSourceCategory | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (LEAD_SOURCE_OPTIONS.some(option => option.toLowerCase() === normalized)) {
    return LEAD_SOURCE_OPTIONS.find(option => option.toLowerCase() === normalized) ?? null;
  }
  return aliases.find(({ terms }) => terms.some(term => normalized.includes(term)))?.category ?? null;
}

export function getLeadSourceGuidance(value: string, selectedSource?: string): string | null {
  const suggested = suggestLeadSourceCategory(value);
  if (selectedSource === "Other" && !value.trim()) return "Check the existing source categories first. Use Other only when the source is genuinely new.";
  if (!suggested) return null;
  if (selectedSource === "Other" || value.trim().toLowerCase() === "other") {
    if (suggested === "Website" && value.toLowerCase().includes("calendly")) {
      return "Calendly is the scheduling tool on our website. Please select Website instead of Other.";
    }
    return `“${suggested}” is already an available source category. Please select ${suggested} instead of Other.`;
  }
  if (suggested !== value.trim()) {
    if (suggested === "Website" && value.toLowerCase().includes("calendly")) {
      return "Calendly is the scheduling tool on our website. Use Website for consistent reporting.";
    }
    return `This looks like “${suggested},” an existing source category. Use that category for consistent reporting.`;
  }
  return null;
}
