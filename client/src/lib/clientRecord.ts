export const CLIENT_MASTER_FIELDS = [
  "name",
  "phone",
  "email",
  "alienNumber",
  "dateOfBirth",
  "address",
  "preferredLanguage",
  "caseType",
  "caseNumber",
  "source",
  "referredBy",
] as const;

export type ClientMasterField = typeof CLIENT_MASTER_FIELDS[number];

type ClientMasterValues = Partial<Record<ClientMasterField, unknown>>;

export function getChangedClientFields(
  master: ClientMasterValues,
  draft: ClientMasterValues,
  fields: readonly ClientMasterField[] = CLIENT_MASTER_FIELDS,
): ClientMasterField[] {
  return fields.filter(field => String(draft[field] ?? "") !== String(master[field] ?? ""));
}

function labeledValue(notes: string, labels: string[]): string {
  const labelPattern = labels.join("|");
  const match = notes.match(new RegExp(`(?:${labelPattern})\\s*[:\\-]?\\s*([^\\n•]+)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function normalizeAlienNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 9 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : value.trim();
}

function normalizeDate(value: string): string {
  const iso = value.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const parsed = Date.parse(value.replace(/(\d)(st|nd|rd|th)\b/gi, "$1"));
  if (Number.isNaN(parsed)) return "";
  const date = new Date(parsed);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Legacy intake imports often kept A-number, DOB, and address inside notes.
 * This derives those values for the form only; it never writes back to the master record.
 */
export function hydrateLeadFromNotes<T extends ClientMasterValues & { notes?: string | null }>(lead: T): T {
  const notes = lead.notes ?? "";
  if (!notes) return lead;
  const alienNumber = String(lead.alienNumber ?? "").trim() || normalizeAlienNumber(labeledValue(notes, ["A\\s*#", "A[- ]*number"]));
  const dateOfBirth = String(lead.dateOfBirth ?? "").trim() || normalizeDate(labeledValue(notes, ["DOB", "Date of Birth"]));
  const address = String(lead.address ?? "").trim() || labeledValue(notes, ["Current Address", "Address"]);
  const preferredLanguage = String(lead.preferredLanguage ?? "").trim() || labeledValue(notes, ["Preferred Language", "Language"]);
  const caseNumber = String(lead.caseNumber ?? "").trim() || labeledValue(notes, ["Case Number", "Case #"]);
  const referredBy = String(lead.referredBy ?? "").trim() || labeledValue(notes, ["Lead Source/Referred By", "Referred By"]);
  const caseType = String(lead.caseType ?? "").trim() || labeledValue(notes, ["Case Type", "Case type"]);
  return { ...lead, alienNumber, dateOfBirth, address, preferredLanguage, caseNumber, referredBy, caseType } as T;
}
