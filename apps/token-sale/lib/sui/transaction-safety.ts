export type TransactionEffectsLike = {
  status?: { status?: string; error?: string };
  transactionDigest?: string;
  gasUsed?: {
    computationCost?: string;
    storageCost?: string;
    storageRebate?: string;
    nonRefundableStorageFee?: string;
  };
};

export function assertSuccessfulEffects(effects: TransactionEffectsLike): string {
  if (effects.status?.status !== "success") throw new Error(effects.status?.error ?? "Sui transaction failed");
  if (!effects.transactionDigest) throw new Error("Missing Sui transaction digest");
  return effects.transactionDigest;
}

export function assertExpectedMoveTarget(target: string, packageId: string, moduleName: string): void {
  const normalized = packageId.toLowerCase();
  if (!target.toLowerCase().startsWith(`${normalized}::${moduleName.toLowerCase()}::`)) {
    throw new Error("Unexpected Move call target");
  }
}
