import { parseSolanaAddress, parseSolanaTransactionSignature, parseSuiAddressOrObject, parseSuiTransactionDigest, type JarvisNetwork } from "./utils/chains.js";

export type ExplorerChain = "sui" | "solana";
export type ExplorerNetwork = JarvisNetwork;

function solanaCluster(network: ExplorerNetwork): string {
  if (!(["mainnet-beta", "testnet", "devnet"] as ExplorerNetwork[]).includes(network)) throw new Error("invalid Solana explorer network");
  return network === "mainnet-beta" ? "" : `?cluster=${network}`;
}

function suiNetwork(network: ExplorerNetwork): string {
  if (!(["mainnet", "testnet", "devnet"] as ExplorerNetwork[]).includes(network)) throw new Error("invalid public Sui explorer network");
  return network;
}

export function transactionExplorerUrl(chain: ExplorerChain, network: ExplorerNetwork, transactionId: string): string {
  return chain === "solana"
    ? `https://explorer.solana.com/tx/${parseSolanaTransactionSignature(transactionId)}${solanaCluster(network)}`
    : `https://suiscan.xyz/${suiNetwork(network)}/tx/${parseSuiTransactionDigest(transactionId)}`;
}

export function addressExplorerUrl(chain: ExplorerChain, network: ExplorerNetwork, address: string): string {
  return chain === "solana"
    ? `https://explorer.solana.com/address/${parseSolanaAddress(address)}${solanaCluster(network)}`
    : `https://suiscan.xyz/${suiNetwork(network)}/account/${parseSuiAddressOrObject(address)}`;
}

export function objectExplorerUrl(network: Exclude<ExplorerNetwork, "mainnet-beta" | "localnet">, objectId: string): string {
  return `https://suiscan.xyz/${suiNetwork(network)}/object/${parseSuiAddressOrObject(objectId)}`;
}
