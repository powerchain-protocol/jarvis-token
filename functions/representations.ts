import type { AssetRepresentation, JarvisChain } from "../common/types.ts";

export interface ResolvedRepresentation extends AssetRepresentation {
  address: string;
  verified: boolean;
}

export function representationForChain(representations: readonly AssetRepresentation[], chain: JarvisChain): AssetRepresentation {
  const matches = representations.filter((item) => item.chain === chain);
  if (matches.length !== 1) throw new Error(`Expected exactly one JARVIS representation for ${chain}`);
  return matches[0]!;
}

export function displayRepresentationLabel(representation: AssetRepresentation): string {
  return representation.type === "canonical" ? "Canonical" : "Bridged";
}

export function resolveRepresentation(
  representation: AssetRepresentation,
  env: Readonly<Record<string, string | undefined>>,
  verified = false,
): ResolvedRepresentation | null {
  const address = representation.address ?? env[representation.addressEnv]?.trim();
  if (!address) return null;
  return { ...representation, address, verified };
}

export function canonicalRepresentation(representations: readonly AssetRepresentation[]): AssetRepresentation {
  const matches = representations.filter((item) => item.type === "canonical");
  if (matches.length !== 1 || matches[0]?.chain !== "sui") throw new Error("Exactly one canonical Sui JARVIS representation is required");
  return matches[0]!;
}

export function bridgedRepresentation(representations: readonly AssetRepresentation[]): AssetRepresentation {
  const matches = representations.filter((item) => item.type === "bridged");
  if (matches.length !== 1 || matches[0]?.chain !== "solana" || matches[0]?.provider !== "wormhole") {
    throw new Error("Exactly one Wormhole-backed Solana JARVIS representation is required");
  }
  return matches[0]!;
}
