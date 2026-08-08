export type JarvisAiUsageKind = "chat" | "agent" | "tool" | "embedding" | "image" | "audio" | "video";

export interface JarvisAiUsageInput {
  promptTokens?: bigint;
  completionTokens?: bigint;
  cachedInputTokens?: bigint;
  toolCalls?: bigint;
  imageUnits?: bigint;
  audioSeconds?: bigint;
  videoSeconds?: bigint;
}

export interface JarvisAiUsagePricingPolicy {
  promptPerMillionBaseUnits: bigint;
  completionPerMillionBaseUnits: bigint;
  cachedInputPerMillionBaseUnits: bigint;
  perToolCallBaseUnits: bigint;
  perImageUnitBaseUnits: bigint;
  perAudioSecondBaseUnits: bigint;
  perVideoSecondBaseUnits: bigint;
}

export interface JarvisAiUsageBreakdown {
  promptBaseUnits: bigint;
  completionBaseUnits: bigint;
  cachedInputBaseUnits: bigint;
  toolCallBaseUnits: bigint;
  imageBaseUnits: bigint;
  audioBaseUnits: bigint;
  videoBaseUnits: bigint;
  totalBaseUnits: bigint;
}

export interface JarvisTokenizedChatRecord {
  id: string;
  sessionId: string;
  messageId: string;
  kind: JarvisAiUsageKind;
  createdAt: string;
  network: "sui" | "solana";
  settlement: "unquoted" | "quoted" | "approval-required" | "settled" | "failed";
  usage: JarvisAiUsageInput;
  quotedBaseUnits?: string;
  transactionDigest?: string;
}
