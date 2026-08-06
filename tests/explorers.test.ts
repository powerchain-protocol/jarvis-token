import { describe, expect, it } from "vitest";
import { addressExplorerUrl, objectExplorerUrl, transactionExplorerUrl } from "../packages/token-core/src/explorers.js";

describe("chain explorer links", () => {
  it("generates network-bound Solana links", () => {
    expect(transactionExplorerUrl("solana", "devnet", "1".repeat(88))).toBe(`https://explorer.solana.com/tx/${"1".repeat(88)}?cluster=devnet`);
    expect(addressExplorerUrl("solana", "mainnet-beta", "11111111111111111111111111111111")).toBe("https://explorer.solana.com/address/11111111111111111111111111111111");
    expect(() => transactionExplorerUrl("solana", "mainnet", "1".repeat(88))).toThrow(/network/);
  });

  it("generates validated Sui transaction, account, and object links", () => {
    const address = `0x${"a".repeat(64)}`;
    expect(transactionExplorerUrl("sui", "testnet", "2".repeat(44))).toBe(`https://suiscan.xyz/testnet/tx/${"2".repeat(44)}`);
    expect(addressExplorerUrl("sui", "mainnet", address)).toBe(`https://suiscan.xyz/mainnet/account/${address}`);
    expect(objectExplorerUrl("devnet", address)).toBe(`https://suiscan.xyz/devnet/object/${address}`);
    expect(() => transactionExplorerUrl("sui", "testnet", address)).toThrow();
    expect(() => addressExplorerUrl("sui", "testnet", "2".repeat(44))).toThrow();
    expect(() => objectExplorerUrl("localnet" as never, address)).toThrow(/network/);
  });
});
