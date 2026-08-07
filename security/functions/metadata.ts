import type { CanonicalAsset } from "../common/types.ts";
import { JARVIS_METADATA } from "../constants/metadata.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";
import { canonicalSha256 } from "../utils/checksums.ts";

export interface TokenMetadataDocument {
  name: "JARVIS";
  symbol: "JARVIS";
  decimals: 6;
  description: string;
  canonicalChain: "sui";
  canonicalAssetId: "jarvis";
  displayPolicy: string;
  digest: string;
}

export function createTokenMetadataDocument(asset: CanonicalAsset): TokenMetadataDocument {
  const base = {
    name: JARVIS_TOKEN.name,
    symbol: JARVIS_TOKEN.symbol,
    decimals: JARVIS_TOKEN.decimals,
    description: asset.metadata.description || JARVIS_METADATA.description,
    canonicalChain: JARVIS_TOKEN.canonicalChain,
    canonicalAssetId: JARVIS_TOKEN.canonicalId,
    displayPolicy: JARVIS_METADATA.displayPolicy,
  } as const;
  return { ...base, digest: canonicalSha256(base) };
}
