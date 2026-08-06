import { readFile } from "node:fs/promises";
import { z } from "zod";
import { networkSchema } from "./network.js";

export const deploymentConfigSchema = z.object({
  network: networkSchema,
  rpcUrl: z.url(),
  treasuryAddress: z.string().min(32),
  feePayerAddress: z.string().min(32),
  mintAddress: z.string().min(32),
  mintAuthorityAddress: z.string().min(32),
  bridgeTokenAuthorityAddress: z.string().min(32),
  metadata: z.object({
    uri: z.url(),
    updateAuthorityAddress: z.string().min(32),
    canonicalMechanism: z.literal("token-2022-mint-extension"),
  }),
  broadcast: z.boolean().default(false),
  mainnetReview: z
    .object({
      changeTicket: z.string().min(3),
      reviewedBy: z.string().min(3),
      generateOnly: z.literal(true),
    })
    .optional(),
}).superRefine((config, context) => {
  if (config.network === "mainnet-beta" && !config.mainnetReview) {
    context.addIssue({
      code: "custom",
      path: ["mainnetReview"],
      message: "mainnet plan generation requires an explicit review acknowledgement",
    });
  }
  if (config.network === "mainnet-beta") {
    const roles = [
      ["treasuryAddress", config.treasuryAddress],
      ["feePayerAddress", config.feePayerAddress],
      ["mintAddress", config.mintAddress],
      ["mintAuthorityAddress", config.mintAuthorityAddress],
      ["bridgeTokenAuthorityAddress", config.bridgeTokenAuthorityAddress],
      ["metadata.updateAuthorityAddress", config.metadata.updateAuthorityAddress],
    ] as const;
    const duplicates = roles.filter(
      ([, address], index) => roles.findIndex(([, candidate]) => candidate === address) !== index,
    );
    for (const [role] of duplicates) {
      context.addIssue({
        code: "custom",
        path: role.split("."),
        message: "mainnet operational roles must use distinct public keys",
      });
    }
  }
});

export type DeploymentConfig = z.infer<typeof deploymentConfigSchema>;

export async function loadDeploymentConfig(path: string): Promise<DeploymentConfig> {
  const source = await readFile(path, "utf8");
  return deploymentConfigSchema.parse(JSON.parse(source));
}
