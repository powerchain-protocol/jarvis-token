import { JARVIS_TOKEN } from "../constants/token.ts";
import { isSha256 } from "../utils/checksums.ts";

export interface MetadataValidationIssue { path: string; message: string; }

export function validateTokenMetadataDocument(value: Record<string, unknown>): readonly MetadataValidationIssue[] {
  const issues: MetadataValidationIssue[] = [];
  if (value.name !== "JARVIS") issues.push({ path: "name", message: "Token name must be JARVIS" });
  if (value.symbol !== "JARVIS") issues.push({ path: "symbol", message: "Token symbol must be JARVIS" });
  if (value.decimals !== JARVIS_TOKEN.decimals) issues.push({ path: "decimals", message: "Token metadata must use 6 decimals" });
  if (value.canonicalChain !== undefined && value.canonicalChain !== "sui") issues.push({ path: "canonicalChain", message: "Canonical chain must be Sui" });
  if (typeof value.digest === "string" && !isSha256(value.digest)) issues.push({ path: "digest", message: "Metadata digest must be SHA-256" });
  return issues;
}
