import type { ReserveMonitorResult } from "../functions/reserve-monitor.ts";

export interface TokenHealthRow {
  label: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  detail: string;
}

export function createTokenHealthRows(input: {
  configured: boolean;
  verified: boolean;
  bridgeEnabled: boolean;
  reserve?: ReserveMonitorResult;
}): readonly TokenHealthRow[] {
  return [
    {
      label: "Deployment",
      status: !input.configured ? "unknown" : input.verified ? "healthy" : "warning",
      detail: !input.configured ? "Deployment identities are not configured." : input.verified ? "Canonical identities verified." : "Verification required.",
    },
    {
      label: "Bridge",
      status: input.bridgeEnabled ? "healthy" : "warning",
      detail: input.bridgeEnabled ? "Transfers enabled." : "Transfers paused.",
    },
    {
      label: "Reserve invariant",
      status: !input.reserve ? "unknown" : input.reserve.healthy ? "healthy" : "critical",
      detail: !input.reserve ? "No reserve observation available." : input.reserve.healthy ? "Bridged supply is fully backed." : input.reserve.reasons.join(", "),
    },
  ];
}
