export function paymentSelectionMatches(selected: ReadonlySet<string>, paymentIds: readonly string[]): boolean {
  return selected.size === paymentIds.length && paymentIds.every(id => selected.has(id));
}
