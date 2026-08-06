import { z } from "zod";

export const networkSchema = z.enum([
  "localnet",
  "devnet",
  "testnet",
  "mainnet-beta",
]);
export type Network = z.infer<typeof networkSchema>;

export const DEFAULT_RPC_URLS: Record<Network, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

export function assertBroadcastAllowed(network: Network, broadcast: boolean): void {
  if (network === "mainnet-beta" && broadcast) {
    throw new Error(
      "Mainnet broadcasting is prohibited: generate an offline signing plan instead.",
    );
  }
}

export function publicRpcOrigin(rpcUrl: string): string {
  const parsed = new URL(rpcUrl);
  return parsed.origin;
}
