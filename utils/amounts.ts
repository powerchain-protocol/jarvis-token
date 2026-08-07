import { JARVIS_TOKEN } from "../constants/token.ts";

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/;

export function parseJarvisAmount(value: string): bigint {
  const normalized = value.trim();
  const match = DECIMAL_PATTERN.exec(normalized);
  if (!match) throw new Error("Invalid JARVIS decimal amount");
  const whole = BigInt(match[1] ?? "0");
  const fraction = match[2] ?? "";
  if (fraction.length > JARVIS_TOKEN.decimals) throw new Error("JARVIS supports at most 6 decimal places");
  const padded = fraction.padEnd(JARVIS_TOKEN.decimals, "0");
  const units = whole * 10n ** BigInt(JARVIS_TOKEN.decimals) + BigInt(padded || "0");
  if (units > JARVIS_TOKEN.maximumBaseUnits) throw new Error("JARVIS amount exceeds maximum supply");
  return units;
}

export function formatJarvisAmount(baseUnits: bigint): string {
  if (baseUnits < 0n || baseUnits > JARVIS_TOKEN.maximumBaseUnits) throw new Error("JARVIS base units are out of range");
  const scale = 10n ** BigInt(JARVIS_TOKEN.decimals);
  const whole = baseUnits / scale;
  const fraction = (baseUnits % scale).toString().padStart(JARVIS_TOKEN.decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
