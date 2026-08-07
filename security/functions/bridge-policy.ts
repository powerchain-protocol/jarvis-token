import { JARVIS_BRIDGE_POLICY } from "../constants/bridge.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";

export interface BridgeDeploymentPolicyInput {
  provider: "wormhole";
  protocol: "ntt";
  canonicalChain: "sui";
  bridgedChain: "solana";
  suiChainId: number;
  solanaChainId: number;
  maxTransferBaseUnits: bigint;
  exactOneToOne: boolean;
  pausedByDefault: boolean;
  sourceDomainValidation: boolean;
  replayProtection: boolean;
}

export interface BridgeDeploymentPolicyReport {
  valid: boolean;
  reasons: readonly string[];
}

export function evaluateBridgeDeploymentPolicy(input: BridgeDeploymentPolicyInput): BridgeDeploymentPolicyReport {
  const reasons: string[] = [];
  if (input.provider !== JARVIS_BRIDGE_POLICY.provider) reasons.push("bridge-provider-invalid");
  if (input.protocol !== JARVIS_BRIDGE_POLICY.protocol) reasons.push("bridge-protocol-invalid");
  if (input.canonicalChain !== "sui") reasons.push("canonical-chain-invalid");
  if (input.bridgedChain !== "solana") reasons.push("bridged-chain-invalid");
  if (input.suiChainId !== JARVIS_BRIDGE_POLICY.wormholeChainIds.sui) reasons.push("sui-chain-domain-invalid");
  if (input.solanaChainId !== JARVIS_BRIDGE_POLICY.wormholeChainIds.solana) reasons.push("solana-chain-domain-invalid");
  if (input.maxTransferBaseUnits <= 0n || input.maxTransferBaseUnits > JARVIS_TOKEN.maximumBaseUnits) {
    reasons.push("max-transfer-invalid");
  }
  if (!input.exactOneToOne) reasons.push("bridge-ratio-not-exact");
  if (!input.pausedByDefault) reasons.push("bridge-not-paused-by-default");
  if (!input.sourceDomainValidation) reasons.push("source-domain-validation-disabled");
  if (!input.replayProtection) reasons.push("replay-protection-disabled");
  return { valid: reasons.length === 0, reasons };
}

export function assertBridgeDeploymentPolicy(input: BridgeDeploymentPolicyInput): void {
  const report = evaluateBridgeDeploymentPolicy(input);
  if (!report.valid) throw new Error(`Invalid JARVIS bridge deployment policy: ${report.reasons.join(",")}`);
}
