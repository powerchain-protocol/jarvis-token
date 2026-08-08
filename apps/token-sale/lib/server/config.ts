import "server-only";
import type { SaleConfig } from "../../types/sale";
import { SALE_CONFIG_EXAMPLE } from "../../config/sale.example";

export function loadSaleConfig(): SaleConfig {
  // Example config is intentionally disabled. Production should load a signed or
  // deployment-controlled config after validating on-chain identifiers.
  return structuredClone(SALE_CONFIG_EXAMPLE);
}
