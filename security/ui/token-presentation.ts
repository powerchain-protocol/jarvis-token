import type { AssetRepresentation } from "../common/types.ts";

export type TokenIconVariant = "canonical" | "dark" | "light";
export type TokenBadgeTone = "success" | "info" | "warning";
export type TokenUiState = "ready" | "paused" | "unconfigured" | "degraded";

export const JARVIS_UI = Object.freeze({
  ticker: "JARVIS",
  canonicalLabel: "JARVIS · Canonical",
  bridgedLabel: "JARVIS · Bridged",
  icons: {
    canonical: "/assets/jarvis-green.png",
    dark: "/assets/jarvis-logo-dark.png",
    light: "/assets/jarvis-logo-light.png",
  },
  fallbackAlt: "JARVIS token",
} as const);

export interface TokenPresentation {
  ticker: "JARVIS";
  title: string;
  subtitle: string;
  chainLabel: "Sui" | "Solana";
  badge: "Canonical" | "Bridged";
  badgeTone: TokenBadgeTone;
  icon: string;
  accessibleLabel: string;
}

export interface TokenStatusPresentation {
  state: TokenUiState;
  label: string;
  detail: string;
  tone: "success" | "warning" | "neutral" | "danger";
}

export function tokenDisplayName(representation: AssetRepresentation): string {
  return representation.type === "canonical" ? JARVIS_UI.canonicalLabel : JARVIS_UI.bridgedLabel;
}

export function tokenAccessibleLabel(representation: AssetRepresentation): string {
  return `${tokenDisplayName(representation)} on ${representation.chain === "sui" ? "Sui" : "Solana"}`;
}

export function createTokenPresentation(representation: AssetRepresentation, variant: TokenIconVariant = "canonical"): TokenPresentation {
  const canonical = representation.type === "canonical";
  return {
    ticker: "JARVIS",
    title: "JARVIS",
    subtitle: canonical ? "Canonical asset on Sui" : "Official bridged representation on Solana",
    chainLabel: canonical ? "Sui" : "Solana",
    badge: canonical ? "Canonical" : "Bridged",
    badgeTone: canonical ? "success" : "info",
    icon: JARVIS_UI.icons[variant],
    accessibleLabel: tokenAccessibleLabel(representation),
  };
}

export function createTokenStatusPresentation(input: { configured: boolean; verified: boolean; bridgeEnabled: boolean; degraded?: boolean }): TokenStatusPresentation {
  if (!input.configured) return { state: "unconfigured", label: "Not configured", detail: "Deployment identities are not configured.", tone: "neutral" };
  if (!input.verified) return { state: "paused", label: "Verification required", detail: "Deployment exists but has not passed verification.", tone: "warning" };
  if (input.degraded) return { state: "degraded", label: "Degraded", detail: "Token infrastructure requires operator attention.", tone: "danger" };
  if (!input.bridgeEnabled) return { state: "paused", label: "Bridge paused", detail: "Token identity is verified; cross-chain transfers are paused.", tone: "warning" };
  return { state: "ready", label: "Operational", detail: "Canonical and bridged representations are verified and available.", tone: "success" };
}

export function compactTokenAddress(address: string | undefined, edge = 5): string {
  if (!address) return "Not configured";
  if (address.length <= edge * 2 + 1) return address;
  return `${address.slice(0, edge)}…${address.slice(-edge)}`;
}
