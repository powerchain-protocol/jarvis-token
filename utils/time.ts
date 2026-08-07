export function assertIsoTimestamp(value: string): void {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(`Invalid canonical ISO timestamp: ${value}`);
  }
}

export function compareIsoTimestamps(a: string, b: string): number {
  assertIsoTimestamp(a);
  assertIsoTimestamp(b);
  return a.localeCompare(b);
}
