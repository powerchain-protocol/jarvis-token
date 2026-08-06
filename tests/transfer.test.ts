import { describe, expect, it } from "vitest";
import { calculateInFlightBaseUnits, completeBridgeTransfer, createBridgeTransfer, markBridgeTransferForManualReview, recordBridgeAttestation } from "../packages/token-core/src/bridge/transfer.js";

const config = {
  environment: "testnet", provider: "wormhole-ntt", canonicalChain: "sui", canonicalMode: "locking",
  wrappedChain: "solana", wrappedMode: "burning", decimals: 6, maximumBaseUnits: "18440000000000000",
  sui: { coinType: "0x1::jarvis::JARVIS", managerPackageId: "0xabc", managerObjectId: "0xdef" },
  solana: { mint: "11111111111111111111111111111111", managerProgramId: "11111111111111111111111111111111", tokenAuthority: "11111111111111111111111111111111" },
  limits: { suiOutboundBaseUnits: "1000", solanaOutboundBaseUnits: "500" }, threshold: 2,
  paused: false, broadcast: false, generateOnly: true,
  transceivers: ["wormhole", "secondary"],
} as const;

const input = { transferId: "transfer-00000001", messageDigest: "d".repeat(64), direction: "sui-to-solana", amountBaseUnits: "100", sender: "0xsui", recipient: "SolRecipient", sourceTransaction: "s".repeat(32), startedAt: "2026-08-06T12:00:00.000Z" } as const;
const attestation = (transceiver: string, id: string, observedAt = "2026-08-06T12:01:00.000Z") => ({ transceiver, attestationId: id.repeat(32), messageDigest: input.messageDigest, observedAt });

describe("bridge transfer state machine", () => {
  it("requires unique threshold attestations before completion", () => {
    const pending = createBridgeTransfer(input, config);
    expect(() => completeBridgeTransfer(pending, "x".repeat(32), "2026-08-06T12:03:00.000Z")).toThrow(/not ready/);
    const one = recordBridgeAttestation(pending, attestation("wormhole", "a"));
    expect(one.status).toBe("pending-attestations");
    expect(() => recordBridgeAttestation(one, attestation("wormhole", "b"))).toThrow(/duplicate/);
    expect(() => recordBridgeAttestation(one, attestation("secondary", "a"))).toThrow(/duplicate attestation ID/);
    const ready = recordBridgeAttestation(one, attestation("secondary", "b", "2026-08-06T12:02:00.000Z"));
    expect(() => completeBridgeTransfer(ready, "x".repeat(32), "2026-08-06T12:01:30.000Z")).toThrow(/predates/);
    const completed = completeBridgeTransfer(ready, "x".repeat(32), "2026-08-06T12:03:00.000Z");
    expect(completed.status).toBe("completed");
  });

  it("rejects pause, replay, digest mismatch, zero, and limit violations", () => {
    expect(() => createBridgeTransfer(input, { ...config, paused: true })).toThrow(/paused/);
    expect(() => createBridgeTransfer(input, config, [input.transferId])).toThrow(/duplicate transfer/);
    expect(() => createBridgeTransfer({ ...input, transferId: "transfer-00000009" }, config, [{ transferId: input.transferId, messageDigest: input.messageDigest }])).toThrow(/duplicate message/);
    expect(() => createBridgeTransfer({ ...input, amountBaseUnits: "0" }, config)).toThrow(/positive/);
    expect(() => createBridgeTransfer({ ...input, amountBaseUnits: "1001" }, config)).toThrow(/capacity/);
    expect(() => createBridgeTransfer({ ...input, amountBaseUnits: "101" }, config, [], "900")).toThrow(/remaining/);
    const record = createBridgeTransfer(input, config);
    expect(() => recordBridgeAttestation(record, { ...attestation("wormhole", "a"), messageDigest: "x".repeat(64) })).toThrow(/digest mismatch/);
    expect(() => recordBridgeAttestation(record, attestation("attacker", "a"))).toThrow(/unregistered/);
    expect(() => recordBridgeAttestation(record, attestation("wormhole", "a", "2026-08-06T11:59:00.000Z"))).toThrow(/predates/);
  });

  it("keeps quarantined transfers in flight", () => {
    const sui = markBridgeTransferForManualReview(createBridgeTransfer(input, config), "relay timed out");
    const sol = createBridgeTransfer({ ...input, transferId: "transfer-00000002", messageDigest: "e".repeat(64), direction: "solana-to-sui", amountBaseUnits: "50" }, config);
    expect(calculateInFlightBaseUnits([sui, sol])).toEqual({ inFlightSuiToSolanaBaseUnits: "100", inFlightSolanaToSuiBaseUnits: "50" });
    expect(() => calculateInFlightBaseUnits([sui, sui])).toThrow(/duplicate transfer/);
  });
});
