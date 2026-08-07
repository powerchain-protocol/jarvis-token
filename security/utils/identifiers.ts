const SUI_COIN_TYPE = /^0x[0-9a-fA-F]{64}::jarvis::JARVIS$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isJarvisSuiCoinType(value: string): boolean {
  return SUI_COIN_TYPE.test(value);
}

export function isSolanaPublicKey(value: string): boolean {
  return BASE58.test(value);
}

export function assertDistinctIdentities(values: readonly string[]): void {
  const normalized = values.filter(Boolean);
  if (new Set(normalized).size !== normalized.length) throw new Error("Token deployment identities must be distinct");
}
