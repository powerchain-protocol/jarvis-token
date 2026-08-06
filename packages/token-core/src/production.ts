import { PublicKey } from "@solana/web3.js";
import { bridgeConfigSchema, type BridgeConfig } from "./bridge/config.js";
import { deploymentConfigSchema, type DeploymentConfig } from "./config.js";

const suiId = /^0x[0-9a-fA-F]{64}$/;

function rejectPlaceholder(value: string, label: string): void {
  if (/REPLACE|example\.invalid/i.test(value)) throw new Error(`${label} contains a placeholder`);
}

function requirePublicKey(value: string, label: string): void {
  rejectPlaceholder(value, label);
  try { new PublicKey(value); } catch (error) {
    throw new Error(`${label} is not a valid Solana public key`, { cause: error });
  }
}

/** Validates semantic consistency across independently maintained production files. */
export function assertProductionConfiguration(
  solanaInput: unknown,
  bridgeInput: unknown,
): { solana: DeploymentConfig; bridge: BridgeConfig } {
  const solana = deploymentConfigSchema.parse(solanaInput);
  const bridge = bridgeConfigSchema.parse(bridgeInput);
  if (solana.network !== "mainnet-beta" || bridge.environment !== "mainnet") {
    throw new Error("production validation requires Solana mainnet-beta and bridge mainnet");
  }
  const keys = {
    feePayerAddress: solana.feePayerAddress,
    treasuryAddress: solana.treasuryAddress,
    mintAddress: solana.mintAddress,
    mintAuthorityAddress: solana.mintAuthorityAddress,
    bridgeTokenAuthorityAddress: solana.bridgeTokenAuthorityAddress,
    metadataUpdateAuthorityAddress: solana.metadata.updateAuthorityAddress,
    managerProgramId: bridge.solana.managerProgramId,
  };
  for (const [label, value] of Object.entries(keys)) requirePublicKey(value, label);
  rejectPlaceholder(solana.metadata.uri, "metadata URI");
  for (const transceiver of bridge.transceivers) rejectPlaceholder(transceiver, "transceiver identity");
  if (solana.mintAddress !== bridge.solana.mint) throw new Error("Solana mint differs between deployment and bridge configurations");
  if (solana.bridgeTokenAuthorityAddress !== bridge.solana.tokenAuthority) throw new Error("NTT token authority differs between deployment and bridge configurations");
  if (!suiId.test(bridge.sui.managerPackageId) || !suiId.test(bridge.sui.managerObjectId)) {
    throw new Error("Sui NTT package and manager must be 32-byte object IDs");
  }
  if (!bridge.sui.coinType.startsWith("0x") || !bridge.sui.coinType.endsWith("::jarvis::JARVIS")) {
    throw new Error("Sui coin type must identify the JARVIS Move type");
  }
  if (bridge.limits.suiOutboundBaseUnits !== "0" || bridge.limits.solanaOutboundBaseUnits !== "0") {
    throw new Error("production candidate must retain zero mainnet rate limits");
  }
  return { solana, bridge };
}
