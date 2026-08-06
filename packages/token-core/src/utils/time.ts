import { z } from "zod";

export function parseIsoInstant(value: string, label = "timestamp"): Date {
  try { z.iso.datetime().parse(value); } catch (error) { throw new Error(`${label} must be an ISO-8601 UTC timestamp`, { cause: error }); }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${label} is invalid`);
  return date;
}

export function assertNotBefore(later: string, earlier: string, laterLabel = "later timestamp", earlierLabel = "earlier timestamp"): void {
  if (parseIsoInstant(later, laterLabel).getTime() < parseIsoInstant(earlier, earlierLabel).getTime()) throw new Error(`${laterLabel} must not precede ${earlierLabel}`);
}
