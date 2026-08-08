export type SaleNetwork = "sui-mainnet" | "sui-testnet";
export type SaleAssetSymbol = "SUI" | "USDC" | "USDT";

export type SaleAsset = {
  symbol: SaleAssetSymbol;
  coinType: string;
  decimals: number;
  enabled: boolean;
};

export type SalePrice = {
  paymentAsset: SaleAssetSymbol;
  paymentBaseUnitsPerJarvisWhole: string;
};

export type SalePhase = {
  id: string;
  label: string;
  startsAt: string;
  endsAt: string;
  allocationBaseUnits: string;
  minPurchaseBaseUnits: string;
  maxPurchaseBaseUnits: string;
  prices: SalePrice[];
  enabled: boolean;
};

export type SaleConfig = {
  network: SaleNetwork;
  jarvisCoinType: string;
  jarvisDecimals: 6;
  totalSaleAllocationBaseUnits: string;
  treasuryAddress: string;
  phases: SalePhase[];
  assets: SaleAsset[];
};
