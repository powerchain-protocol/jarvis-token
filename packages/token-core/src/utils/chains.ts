import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

export type JarvisChain = "sui" | "solana";
export type JarvisNetwork = "mainnet" | "mainnet-beta" | "testnet" | "devnet" | "localnet";

const NETWORKS: Readonly<Record<JarvisChain, readonly JarvisNetwork[]>> = Object.freeze({
  sui: ["mainnet", "testnet", "devnet", "localnet"],
  solana: ["mainnet-beta", "testnet", "devnet"],
});

export function assertChainNetwork(chain: JarvisChain, network: string): asserts network is JarvisNetwork {
  if (!(NETWORKS[chain] as readonly string[]).includes(network)) throw new Error("network is invalid for the selected chain");
}

export function parseSolanaAddress(value: string): string {
  try { return new PublicKey(value).toBase58(); } catch (error) { throw new Error("invalid Solana address", { cause: error }); }
}

export function parseSolanaTransactionSignature(value: string): string {
  return z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{80,90}$/, "invalid Solana transaction signature").parse(value);
}

export function parseSuiAddressOrObject(value: string): string {
  return z.string().regex(/^0x[0-9a-fA-F]{64}$/, "invalid Sui address or object ID").parse(value);
}

export function parseSuiTransactionDigest(value: string): string {
  return z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{40,50}$/, "invalid Sui transaction digest").parse(value);
}
