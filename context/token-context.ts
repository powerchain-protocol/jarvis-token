import type { JarvisEnvironment } from "../common/types.ts";
import { JARVIS_ENV } from "../constants/config.ts";
import { createJarvisCanonicalAsset } from "../functions/asset.ts";
import { deploymentReadiness } from "../functions/deployment.ts";
import { evaluateTokenHealth } from "../functions/health.ts";
import { evaluateTokenActivation } from "../security/activation.ts";
import { readBooleanEnv, readEnumEnv, readOptionalEnv } from "../utils/env.ts";

export interface JarvisTokenContext {
  environment: JarvisEnvironment;
  bridgeEnabled: boolean;
  requestedBridgeEnabled: boolean;
  asset: ReturnType<typeof createJarvisCanonicalAsset>;
  readiness: ReturnType<typeof deploymentReadiness>;
  activation: ReturnType<typeof evaluateTokenActivation>;
  health: ReturnType<typeof evaluateTokenHealth>;
  configured: {
    suiCoinType: boolean;
    solanaMint: boolean;
    wormholeProvider: boolean;
  };
}

export function createJarvisTokenContext(env: Record<string, string | undefined>): JarvisTokenContext {
  const environment = readEnumEnv(env, JARVIS_ENV.bridgeEnvironment, ["testnet", "mainnet"] as const, "testnet");
  const suiCoinType = readOptionalEnv(env, JARVIS_ENV.suiCoinType);
  const solanaMint = readOptionalEnv(env, JARVIS_ENV.solanaMint);
  const wormholeProviderId = readOptionalEnv(env, JARVIS_ENV.wormholeProviderId);
  const deploymentVerified = readBooleanEnv(env, JARVIS_ENV.deploymentVerified);
  const requestedBridgeEnabled = readBooleanEnv(env, JARVIS_ENV.bridgeEnabled);

  const descriptor = {
    environment,
    ...(suiCoinType ? { suiCoinType } : {}),
    ...(solanaMint ? { solanaMint } : {}),
    ...(wormholeProviderId ? { wormholeProviderId } : {}),
    verified: deploymentVerified,
  };

  const readiness = deploymentReadiness(descriptor);
  const activation = evaluateTokenActivation({
    ...descriptor,
    bridgeEnabled: requestedBridgeEnabled,
    wormholeRouteVerified: readBooleanEnv(env, JARVIS_ENV.wormholeRouteVerified),
    reserveMonitorEnabled: readBooleanEnv(env, JARVIS_ENV.reserveMonitorEnabled),
    emergencyPauseConfigured: readBooleanEnv(env, JARVIS_ENV.emergencyPauseConfigured),
  });

  const bridgeEnabled = requestedBridgeEnabled && readiness.ready && activation.allowed;
  const asset = createJarvisCanonicalAsset({
    ...(suiCoinType ? { suiCoinType } : {}),
    ...(solanaMint ? { solanaMint } : {}),
    verification: deploymentVerified && suiCoinType && solanaMint ? "verified" : "deployment-gated",
  });

  return {
    environment,
    bridgeEnabled,
    requestedBridgeEnabled,
    asset,
    readiness,
    activation,
    health: evaluateTokenHealth(asset, bridgeEnabled),
    configured: {
      suiCoinType: Boolean(suiCoinType),
      solanaMint: Boolean(solanaMint),
      wormholeProvider: Boolean(wormholeProviderId),
    },
  };
}
