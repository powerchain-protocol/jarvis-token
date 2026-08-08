export const JARVIS_BURN_POLICY = Object.freeze({
  enabled: true,
  maximumQuarterlyBurnBps: 200,
  windowDays: 90,
  automatic: false,
  remintAfterBurn: false,
  canonicalChain: "sui",
} as const);
