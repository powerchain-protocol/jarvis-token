export type SuiGasCostSummary = {
  computationCost: bigint;
  storageCost: bigint;
  storageRebate: bigint;
  nonRefundableStorageFee: bigint;
};

export function netGasCost(summary: SuiGasCostSummary): bigint {
  return summary.computationCost + summary.storageCost + summary.nonRefundableStorageFee - summary.storageRebate;
}

export function gasBudgetWithMargin(estimatedNetGas: bigint, marginBps = 2500n): bigint {
  if (estimatedNetGas < 0n) return 0n;
  return estimatedNetGas + (estimatedNetGas * marginBps) / 10_000n;
}
