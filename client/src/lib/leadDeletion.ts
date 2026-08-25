export type DeletableLead = {
  id: string;
  name: string;
};

/**
 * Executes a deletion only after the UI has explicitly selected a lead for
 * confirmation. A null target is a deliberate no-op, protecting against
 * accidental invocation from a closed or dismissed confirmation dialog.
 */
export async function deleteAfterConfirmation(
  lead: DeletableLead | null,
  removeLead: (leadId: string) => Promise<unknown> | unknown,
): Promise<string | null> {
  if (!lead) return null;
  await removeLead(lead.id);
  return lead.name;
}
