export const TOKEN = Object.freeze({
  name: "Jarvis AI",
  symbol: "JARVIS",
  version: "1.0.0-rc.0",
  decimals: 6,
  maximumWholeSupply: 18_440_000_000n,
  maximumBaseUnits: 18_440_000_000_000_000n,
} as const);

export const PROGRAM_IDS = Object.freeze({
  system: "11111111111111111111111111111111",
  token: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  token2022: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  associatedToken: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  metaplexMetadata: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
} as const);

const calculatedBaseUnits =
  TOKEN.maximumWholeSupply * 10n ** BigInt(TOKEN.decimals);

if (calculatedBaseUnits !== TOKEN.maximumBaseUnits) {
  throw new Error("JARVIS supply constants are internally inconsistent");
}
