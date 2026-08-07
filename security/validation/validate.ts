import type { CanonicalAsset } from "../common/types.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";
import { isJarvisSuiCoinType, isSolanaPublicKey } from "../utils/identifiers.ts";

export interface ValidationIssue { path: string; message: string; }
export interface ValidationReport { valid: boolean; issues: ValidationIssue[]; }

export function validateCanonicalJarvisAsset(asset: CanonicalAsset): ValidationReport {
  const issues: ValidationIssue[] = [];
  if (asset.name !== "JARVIS" || asset.symbol !== "JARVIS") issues.push({ path: "name", message: "Canonical token identity must be JARVIS" });
  if (asset.canonicalChain !== "sui") issues.push({ path: "canonicalChain", message: "JARVIS canonical chain must be Sui" });
  if (asset.decimals !== JARVIS_TOKEN.decimals) issues.push({ path: "decimals", message: "JARVIS must use 6 decimals" });
  const canonical = asset.representations.filter((item) => item.type === "canonical");
  if (canonical.length !== 1 || canonical[0]?.chain !== "sui") issues.push({ path: "representations", message: "Exactly one canonical Sui representation is required" });
  const bridged = asset.representations.filter((item) => item.type === "bridged");
  if (bridged.length !== 1 || bridged[0]?.chain !== "solana" || bridged[0]?.provider !== "wormhole") issues.push({ path: "representations", message: "Exactly one Wormhole-backed Solana bridged representation is required" });
  if (asset.bridgeSupport.provider !== "wormhole" || asset.bridgeSupport.protocol !== "ntt" || asset.bridgeSupport.exactOneToOne !== true) issues.push({ path: "bridgeSupport", message: "JARVIS bridge support must use exact 1:1 Wormhole NTT" });
  if (asset.bridgeSupport.routes.length !== 2 || !asset.bridgeSupport.routes.includes("jarvis:sui:solana:wormhole-ntt") || !asset.bridgeSupport.routes.includes("jarvis:solana:sui:wormhole-ntt")) issues.push({ path: "bridgeSupport.routes", message: "Both canonical JARVIS route directions are required" });
  if (canonical[0]?.address && !isJarvisSuiCoinType(canonical[0].address)) issues.push({ path: "representations.sui.address", message: "Invalid Sui coin type" });
  if (bridged[0]?.address && !isSolanaPublicKey(bridged[0].address)) issues.push({ path: "representations.solana.address", message: "Invalid Solana mint" });
  return { valid: issues.length === 0, issues };
}
