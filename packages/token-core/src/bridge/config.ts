import { readFile } from "node:fs/promises";
import { z } from "zod";
import { TOKEN } from "../constants.js";

const uintString = z.string().regex(/^\d+$/);

export const bridgeConfigSchema = z.object({
  environment: z.enum(["testnet", "mainnet"]),
  provider: z.literal("wormhole-ntt"),
  canonicalChain: z.literal("sui"),
  canonicalMode: z.literal("locking"),
  wrappedChain: z.literal("solana"),
  wrappedMode: z.literal("burning"),
  decimals: z.literal(TOKEN.decimals),
  maximumBaseUnits: z.literal(TOKEN.maximumBaseUnits.toString()),
  sui: z.object({
    coinType: z.string().min(3),
    managerPackageId: z.string().min(3),
    managerObjectId: z.string().min(3),
  }),
  solana: z.object({
    mint: z.string().min(32),
    managerProgramId: z.string().min(32),
    tokenAuthority: z.string().min(32),
  }),
  limits: z.object({
    suiOutboundBaseUnits: uintString,
    solanaOutboundBaseUnits: uintString,
  }),
  threshold: z.number().int().positive(),
  transceivers: z.array(z.string().min(3)).min(1),
  paused: z.boolean(),
  broadcast: z.literal(false),
  generateOnly: z.literal(true),
}).superRefine((config, context) => {
  for (const [field, value] of Object.entries(config.limits)) {
    if (BigInt(value) > TOKEN.maximumBaseUnits) context.addIssue({
      code: "custom", path: ["limits", field], message: "rate limit exceeds fixed supply",
    });
  }
  if (config.environment === "mainnet" && !config.paused) context.addIssue({
    code: "custom", path: ["paused"], message: "mainnet plans must start paused",
  });
  if (new Set(config.transceivers).size !== config.transceivers.length) context.addIssue({
    code: "custom", path: ["transceivers"], message: "transceiver identities must be unique",
  });
  if (config.threshold > new Set(config.transceivers).size) context.addIssue({
    code: "custom", path: ["threshold"], message: "threshold exceeds configured unique transceivers",
  });
});

export type BridgeConfig = z.infer<typeof bridgeConfigSchema>;

export async function loadBridgeConfig(path: string): Promise<BridgeConfig> {
  return bridgeConfigSchema.parse(JSON.parse(await readFile(path, "utf8")));
}

export function buildNttReviewPlan(input: unknown) {
  const config = bridgeConfigSchema.parse(input);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    broadcast: false,
    config,
    phases: [
      "Deploy upstream Wormhole NTT managers and transceivers in the configured modes.",
      "Register reciprocal peers and apply conservative inbound/outbound rate limits.",
      "Transfer the Solana Token-2022 mint authority with NTT's checked set/claim flow.",
      "Lock a small Sui test amount, wait for attestation, and redeem wrapped JARVIS on Solana.",
      "Burn that wrapped amount on Solana and verify release of the same Sui amount.",
      "Reconcile supply invariants and publish deployment evidence before unpausing.",
    ],
    mainnetRequirements: [
      "Independent review of exact upstream NTT release and deployment bytecode",
      "Multisig custody for Sui AdminCap/UpgradeCap and Solana ownership",
      "Monitoring, pause runbook, rate-limit policy, and recovery drill",
      "Generate, simulate, review, and sign outside this repository; never auto-broadcast",
    ],
  } as const;
}
