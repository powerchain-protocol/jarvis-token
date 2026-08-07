import type { AssetRepresentation, JarvisChain } from "../common/types.ts";

export function representationForChain(representations: readonly AssetRepresentation[], chain: JarvisChain): AssetRepresentation {
  const matches = representations.filter((item) => item.chain === chain);
  if (matches.length !== 1) throw new Error(`Expected exactly one JARVIS representation for ${chain}`);
  return matches[0]!;
}

export function displayRepresentationLabel(representation: AssetRepresentation): string {
  return representation.type === "canonical" ? "Canonical" : "Bridged";
}
