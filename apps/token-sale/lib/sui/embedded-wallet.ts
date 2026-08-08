export type EmbeddedSuiWallet = {
  address: string | null;
  connect(): Promise<string>;
  signAndExecute(transactionBytes: Uint8Array): Promise<{ digest: string }>;
  disconnect(): Promise<void>;
};

export type EmbeddedWalletProvider = {
  isAvailable(): boolean;
  wallet(): EmbeddedSuiWallet;
};

export function createUnavailableEmbeddedWalletProvider(): EmbeddedWalletProvider {
  return {
    isAvailable: () => false,
    wallet: () => ({
      address: null,
      connect: async () => { throw new Error("Embedded wallet provider is not configured"); },
      signAndExecute: async () => { throw new Error("Embedded wallet provider is not configured"); },
      disconnect: async () => undefined,
    }),
  };
}
