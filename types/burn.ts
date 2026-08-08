export type BurnWindow = {
  windowId: string;
  opensAtMs: number;
  closesAtMs: number;
  maximumBurnBps: 200;
};

export type BurnSnapshot = {
  circulatingBaseUnits: bigint;
  alreadyBurnedInWindowBaseUnits: bigint;
};

export type BurnRequest = {
  requestedBaseUnits: bigint;
  requestedAtMs: number;
  reason: string;
};

export type BurnQuote = {
  allowed: boolean;
  requestedBaseUnits: bigint;
  remainingWindowCapacityBaseUnits: bigint;
  maximumWindowBurnBaseUnits: bigint;
  reason?: string;
};
