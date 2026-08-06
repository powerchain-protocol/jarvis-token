import { z } from "zod";
import { TOKEN } from "./constants.js";

/** Canonical unsigned JARVIS base-unit amount bounded by the fixed supply. */
export const jarvisAmountSchema = z.string()
  .regex(/^(0|[1-9]\d*)$/, "amount must be a canonical unsigned integer")
  .refine((value) => BigInt(value) <= TOKEN.maximumBaseUnits, "amount exceeds JARVIS maximum supply");

/** A non-zero JARVIS amount for operations that cannot be no-ops. */
export const positiveJarvisAmountSchema = jarvisAmountSchema
  .refine((value) => BigInt(value) > 0n, "amount must be positive");

