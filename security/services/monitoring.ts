import { JarvisTokenError } from "../common/errors.ts";
import { verifyOnChainJarvis } from "../functions/onchain-verification.ts";
import { evaluateBridgeReserve } from "../functions/reserve-monitor.ts";
import type { TokenStorage } from "../storage/types.ts";
import type { TokenObservationProvider, TokenObservationSnapshot } from "./ports.ts";

export interface TokenMonitoringPolicy {
  maxObservationAgeMs: number;
  failClosed: boolean;
}

export interface TokenMonitoringReport {
  healthy: boolean;
  pauseNewTransfers: boolean;
  reasons: readonly string[];
  snapshot?: TokenObservationSnapshot;
  onChain?: ReturnType<typeof verifyOnChainJarvis>;
  reserve?: ReturnType<typeof evaluateBridgeReserve>;
}

export class TokenMonitoringService {
  private readonly provider: TokenObservationProvider;
  private readonly storage: TokenStorage;
  private readonly policy: TokenMonitoringPolicy;

  constructor(provider: TokenObservationProvider, storage: TokenStorage, policy: TokenMonitoringPolicy) {
    this.provider = provider;
    this.storage = storage;
    this.policy = policy;
  }

  async inspect(input: { expectedSuiCoinType: string; expectedSolanaMint: string; now?: Date }): Promise<TokenMonitoringReport> {
    const now = input.now ?? new Date();
    try {
      const [sui, solana, reserveObservation] = await Promise.all([
        this.provider.observeSui(),
        this.provider.observeSolana(),
        this.provider.observeReserve(),
      ]);
      const snapshot: TokenObservationSnapshot = {
        id: `jarvis-observation:${now.toISOString()}`,
        observedAt: now.toISOString(),
        sui,
        solana,
        reserve: reserveObservation,
      };
      const stale = [sui.observedAt, solana.observedAt, reserveObservation.observedAt].some((value) => {
        const age = now.getTime() - Date.parse(value);
        return !Number.isFinite(age) || age < 0 || age > this.policy.maxObservationAgeMs;
      });
      const onChain = verifyOnChainJarvis({
        expectedSuiCoinType: input.expectedSuiCoinType,
        expectedSolanaMint: input.expectedSolanaMint,
        sui: {
          coinType: sui.identity,
          decimals: sui.decimals,
          totalSupplyBaseUnits: sui.totalSupplyBaseUnits,
        },
        solana: {
          mint: solana.identity,
          decimals: solana.decimals,
          supplyBaseUnits: solana.totalSupplyBaseUnits,
          freezeAuthority: solana.freezeAuthority ?? null,
        },
      });
      const reserve = evaluateBridgeReserve({
        lockedCanonicalBaseUnits: reserveObservation.lockedCanonicalBaseUnits,
        bridgedSupplyBaseUnits: solana.totalSupplyBaseUnits,
        ...(reserveObservation.pendingInboundBaseUnits !== undefined ? { pendingInboundBaseUnits: reserveObservation.pendingInboundBaseUnits } : {}),
        ...(reserveObservation.pendingOutboundBaseUnits !== undefined ? { pendingOutboundBaseUnits: reserveObservation.pendingOutboundBaseUnits } : {}),
      });
      const reasons = [...onChain.issues, ...reserve.reasons];
      if (stale) reasons.push("observation-stale");
      await this.storage.appendSnapshot("onchain-observations", {
        id: snapshot.id,
        recordedAt: snapshot.observedAt,
        digest: `${sui.identity}:${solana.identity}:${snapshot.observedAt}`,
        value: snapshot,
      });
      return {
        healthy: reasons.length === 0,
        pauseNewTransfers: reasons.length > 0,
        reasons: [...new Set(reasons)],
        snapshot,
        onChain,
        reserve,
      };
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      return {
        healthy: false,
        pauseNewTransfers: this.policy.failClosed,
        reasons: ["observation-unavailable", reason],
      };
    }
  }
}

export function assertMonitoringHealthy(report: TokenMonitoringReport): void {
  if (!report.healthy) {
    throw new JarvisTokenError("INVARIANT_VIOLATION", "JARVIS token monitoring is not healthy", { reasons: report.reasons });
  }
}
