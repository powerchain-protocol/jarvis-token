import { assertDistinctIdentities, isJarvisSuiCoinType, isSolanaPublicKey } from "../utils/identifiers.ts";

export const FORBIDDEN_PUBLIC_SECRET_KEYS = Object.freeze([
  "PRIVATE_KEY", "MNEMONIC", "SEED_PHRASE", "RECOVERY_PHRASE", "SUI_KEYSTORE", "TRITON_RPC_TOKEN", "HELIUS_API_KEY",
] as const);

export interface TokenDeploymentSecurityInput {
  bridgeEnabled: boolean;
  suiCoinType?: string;
  solanaMint?: string;
  solanaBridgeProgramId?: string;
  solanaTokenAuthority?: string;
  freezeAuthority?: string | null;
}

export function assertTokenDeploymentSecurity(input: TokenDeploymentSecurityInput): void {
  if (input.suiCoinType && !isJarvisSuiCoinType(input.suiCoinType)) throw new Error("Invalid canonical Sui JARVIS coin type");
  for (const value of [input.solanaMint, input.solanaBridgeProgramId, input.solanaTokenAuthority]) {
    if (value && !isSolanaPublicKey(value)) throw new Error("Invalid Solana deployment identity");
  }
  assertDistinctIdentities([input.solanaMint ?? "", input.solanaBridgeProgramId ?? "", input.solanaTokenAuthority ?? ""]);
  if (input.freezeAuthority) throw new Error("Official bridged JARVIS freeze authority must be disabled");
  if (input.bridgeEnabled && (!input.suiCoinType || !input.solanaMint || !input.solanaBridgeProgramId || !input.solanaTokenAuthority)) {
    throw new Error("Bridge activation requires all verified token deployment identities");
  }
}

export function assertNoPublicSecrets(env: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    if (key.startsWith("NEXT_PUBLIC_") && FORBIDDEN_PUBLIC_SECRET_KEYS.some((secret) => key.includes(secret))) {
      throw new Error(`Secret-like token configuration cannot be public: ${key}`);
    }
  }
}
