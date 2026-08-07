import { JARVIS_TOKEN } from "../constants/token.ts";

export interface SuiTokenObservation {
  coinType: string;
  decimals: number;
  totalSupplyBaseUnits: bigint;
}

export interface SolanaTokenObservation {
  mint: string;
  decimals: number;
  supplyBaseUnits: bigint;
  freezeAuthority: string | null;
}

export interface OnChainVerificationReport {
  valid: boolean;
  issues: readonly string[];
}

export function verifyOnChainJarvis(input: {
  sui: SuiTokenObservation;
  solana: SolanaTokenObservation;
  expectedSuiCoinType: string;
  expectedSolanaMint: string;
}): OnChainVerificationReport {
  const issues: string[] = [];
  if (input.sui.coinType !== input.expectedSuiCoinType) issues.push("sui-coin-type-mismatch");
  if (input.solana.mint !== input.expectedSolanaMint) issues.push("solana-mint-mismatch");
  if (input.sui.decimals !== JARVIS_TOKEN.decimals) issues.push("sui-decimals-mismatch");
  if (input.solana.decimals !== JARVIS_TOKEN.decimals) issues.push("solana-decimals-mismatch");
  if (input.solana.freezeAuthority !== null) issues.push("solana-freeze-authority-enabled");
  if (input.sui.totalSupplyBaseUnits > JARVIS_TOKEN.maximumBaseUnits) issues.push("sui-supply-exceeds-cap");
  if (input.solana.supplyBaseUnits > JARVIS_TOKEN.maximumBaseUnits) issues.push("solana-supply-exceeds-cap");
  return { valid: issues.length === 0, issues };
}
