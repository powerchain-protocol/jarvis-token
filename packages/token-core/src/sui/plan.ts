import { z } from "zod";
import { TOKEN } from "../constants.js";
import { networkSchema, type Network } from "../network.js";

export const suiPlanConfigSchema = z.object({
  network: networkSchema,
  treasuryAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .refine((address) => !/^0x0{64}$/.test(address), "treasury cannot be the zero address"),
  publisherAddress: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  gasBudget: z.number().int().positive().default(200_000_000),
  packagePath: z.string().min(1).optional(),
}).superRefine((config, context) => {
  if (config.publisherAddress.toLowerCase() !== config.treasuryAddress.toLowerCase()) {
    context.addIssue({
      code: "custom",
      path: ["publisherAddress"],
      message: "publisher must equal treasury because init transfers the full supply to sender",
    });
  }
});

export type SuiPlanConfig = z.infer<typeof suiPlanConfigSchema>;

export interface SuiDeploymentPlan {
  schemaVersion: 1;
  generatedAt: string;
  network: Network;
  broadcast: false;
  treasuryAddress: string;
  requiredPublisherAddress: string;
  command: string[];
  expected: {
    decimals: number;
    supplyBaseUnits: string;
    treasuryCap: "consumed-during-publish";
    metadata: "frozen";
    fixedSupplyProof: "frozen";
  };
  warnings: string[];
}

export function buildSuiDeploymentPlan(input: unknown): SuiDeploymentPlan {
  const config = suiPlanConfigSchema.parse(input);
  const networkFlag = config.network === "mainnet-beta" ? "mainnet" : config.network;
  const packagePath =
    config.packagePath ??
    (config.network === "mainnet-beta"
      ? "contracts/jarvis"
      : config.network === "testnet"
        ? "testnet-contract/jarvis"
        : "packages/jarvis-sui");

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    network: config.network,
    broadcast: false,
    treasuryAddress: config.treasuryAddress,
    requiredPublisherAddress: config.publisherAddress,
    command: [
      "sui",
      "client",
      "publish",
      packagePath,
      "--client.config",
      "<REVIEWED_SUI_CLIENT_CONFIG>",
      "--env",
      networkFlag,
      "--gas-budget",
      String(config.gasBudget),
      "--json",
    ],
    expected: {
      decimals: TOKEN.decimals,
      supplyBaseUnits: TOKEN.maximumBaseUnits.toString(),
      treasuryCap: "consumed-during-publish",
      metadata: "frozen",
      fixedSupplyProof: "frozen",
    },
    warnings: [
      "This is a review artifact, not an executed command.",
      "The publish sender becomes the sole initial treasury recipient.",
      "For mainnet, use a separately approved offline/MPC signing workflow.",
      "Record the package ID, coin type, object IDs, and transaction digest after execution.",
    ],
  };
}
