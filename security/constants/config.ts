export const JARVIS_ENV = Object.freeze({
  bridgeEnvironment: "JARVIS_BRIDGE_ENVIRONMENT",
  bridgeEnabled: "JARVIS_BRIDGE_ENABLED",
  suiCoinType: "JARVIS_SUI_COIN_TYPE",
  solanaMint: "WRAPPED_JARVIS_SOLANA_MINT",
  wormholeProviderId: "JARVIS_WORMHOLE_PROVIDER_ID",
  deploymentVerified: "JARVIS_TOKEN_DEPLOYMENT_VERIFIED",
  reserveMonitorEnabled: "JARVIS_RESERVE_MONITOR_ENABLED",
  emergencyPauseConfigured: "JARVIS_EMERGENCY_PAUSE_CONFIGURED",
  wormholeRouteVerified: "JARVIS_WORMHOLE_ROUTE_VERIFIED",
} as const);

export const TRUE_ENV_VALUE = "true" as const;
