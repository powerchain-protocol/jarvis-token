import type { SaleConfig } from "../types/sale";

export const SALE_CONFIG_EXAMPLE: SaleConfig = {
  network: "sui-testnet",
  jarvisCoinType: "0xPACKAGE::jarvis::JARVIS",
  jarvisDecimals: 6,
  totalSaleAllocationBaseUnits: "5000000000000000",
  treasuryAddress: "0xTREASURY",
  assets: [
    { symbol: "SUI", coinType: "0x2::sui::SUI", decimals: 9, enabled: true },
    { symbol: "USDC", coinType: "0xUSDC", decimals: 6, enabled: false },
    { symbol: "USDT", coinType: "0xUSDT", decimals: 6, enabled: false }
  ],
  phases: [
    {
      id: "presale-1",
      label: "Presale Phase 1",
      startsAt: "2026-09-01T00:00:00Z",
      endsAt: "2026-09-30T23:59:59Z",
      allocationBaseUnits: "1500000000000000",
      minPurchaseBaseUnits: "1000000",
      maxPurchaseBaseUnits: "250000000000",
      prices: [{ paymentAsset: "SUI", paymentBaseUnitsPerJarvisWhole: "400" }],
      enabled: false
    },
    {
      id: "presale-2",
      label: "Presale Phase 2",
      startsAt: "2026-10-01T00:00:00Z",
      endsAt: "2026-10-31T23:59:59Z",
      allocationBaseUnits: "1750000000000000",
      minPurchaseBaseUnits: "1000000",
      maxPurchaseBaseUnits: "250000000000",
      prices: [{ paymentAsset: "SUI", paymentBaseUnitsPerJarvisWhole: "500" }],
      enabled: false
    },
    {
      id: "presale-3",
      label: "Presale Phase 3",
      startsAt: "2026-11-01T00:00:00Z",
      endsAt: "2026-11-30T23:59:59Z",
      allocationBaseUnits: "1750000000000000",
      minPurchaseBaseUnits: "1000000",
      maxPurchaseBaseUnits: "250000000000",
      prices: [{ paymentAsset: "SUI", paymentBaseUnitsPerJarvisWhole: "600" }],
      enabled: false
    }
  ]
};
