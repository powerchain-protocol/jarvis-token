import { z } from "zod";
import { TOKEN } from "../constants.js";

const amount = z.string().regex(/^\d+$/);
export const bridgeSnapshotSchema = z.object({
  suiCirculatingBaseUnits: amount,
  suiLockedBaseUnits: amount,
  solanaWrappedSupplyBaseUnits: amount,
  inFlightSuiToSolanaBaseUnits: amount.default("0"),
  inFlightSolanaToSuiBaseUnits: amount.default("0"),
});

export function verifyBridgeSnapshot(input: unknown) {
  const snapshot = bridgeSnapshotSchema.parse(input);
  const suiCirculating = BigInt(snapshot.suiCirculatingBaseUnits);
  const suiLocked = BigInt(snapshot.suiLockedBaseUnits);
  const wrapped = BigInt(snapshot.solanaWrappedSupplyBaseUnits);
  const toSolana = BigInt(snapshot.inFlightSuiToSolanaBaseUnits);
  const toSui = BigInt(snapshot.inFlightSolanaToSuiBaseUnits);
  const checks = {
    canonicalSupplyFixed: suiCirculating + suiLocked === TOKEN.maximumBaseUnits,
    wrappedFullyBacked: wrapped + toSolana + toSui === suiLocked,
    boundsValid: [wrapped, suiLocked, toSolana, toSui].every(
      (value) => value <= TOKEN.maximumBaseUnits,
    ),
  };
  return { verified: Object.values(checks).every(Boolean), checks, snapshot };
}
