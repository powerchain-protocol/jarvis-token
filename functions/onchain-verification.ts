import { JARVIS_TOKEN } from "../constants/token.ts";
import { isExactSolanaPublicKey, isFullSuiCoinType } from "./deployment-evidence.ts";

export interface SuiTokenObservation {
  coinType: string;
  decimals: number;
  totalSupplyBaseUnits: bigint;
  treasuryCapExists?: boolean;
  metadataFrozen?: boolean;
}

export interface SolanaTokenObservation {
  mint: string;
  decimals: number;
  supplyBaseUnits: bigint;
  freezeAuthority: string | null;
  mintAuthority?: string | null;
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

/** Production verification adds finalization and authority invariants to generic monitoring. */
export function verifyProductionOnChainJarvis(input: {
  sui: Required<Pick<SuiTokenObservation, "coinType" | "decimals" | "totalSupplyBaseUnits" | "treasuryCapExists" | "metadataFrozen">>;
  solana: Required<Pick<SolanaTokenObservation, "mint" | "decimals" | "supplyBaseUnits" | "freezeAuthority" | "mintAuthority">>;
  expectedSuiCoinType: string;
  expectedSolanaMint: string;
  expectedSolanaMintAuthority: string;
}): OnChainVerificationReport {
  const issues = [...verifyOnChainJarvis(input).issues];
  if (!isFullSuiCoinType(input.expectedSuiCoinType)) issues.push("expected-sui-coin-type-not-full");
  if (!isExactSolanaPublicKey(input.expectedSolanaMint)) issues.push("expected-solana-mint-invalid");
  if (!isExactSolanaPublicKey(input.expectedSolanaMintAuthority)) issues.push("expected-solana-mint-authority-invalid");
  if (input.sui.totalSupplyBaseUnits !== JARVIS_TOKEN.maximumBaseUnits) issues.push("sui-production-supply-not-exact-fixed-supply");
  if (input.sui.treasuryCapExists) issues.push("sui-treasury-cap-still-exists");
  if (!input.sui.metadataFrozen) issues.push("sui-metadata-not-frozen");
  if (input.solana.mintAuthority !== input.expectedSolanaMintAuthority) issues.push("solana-mint-authority-mismatch");
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
