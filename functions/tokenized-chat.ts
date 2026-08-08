import type { JarvisAiUsageInput, JarvisTokenizedChatRecord } from "../common/ai.ts";

export function createJarvisTokenizedChatRecord(input: {
  id: string;
  sessionId: string;
  messageId: string;
  createdAt: string;
  network?: "sui" | "solana";
  usage?: JarvisAiUsageInput;
  quotedBaseUnits?: bigint;
}): JarvisTokenizedChatRecord {
  if (!input.id.trim()) throw new TypeError("record id is required");
  if (!input.sessionId.trim()) throw new TypeError("session id is required");
  if (!input.messageId.trim()) throw new TypeError("message id is required");
  if (!Number.isFinite(Date.parse(input.createdAt))) throw new TypeError("createdAt must be an ISO-compatible timestamp");
  if (input.quotedBaseUnits !== undefined && input.quotedBaseUnits < 0n) throw new RangeError("quotedBaseUnits cannot be negative");

  return {
    id: input.id,
    sessionId: input.sessionId,
    messageId: input.messageId,
    kind: "chat",
    createdAt: input.createdAt,
    network: input.network ?? "sui",
    settlement: input.quotedBaseUnits === undefined ? "unquoted" : "quoted",
    usage: input.usage ?? {},
    ...(input.quotedBaseUnits === undefined ? {} : { quotedBaseUnits: input.quotedBaseUnits.toString() }),
  };
}

export function markJarvisChatApprovalRequired(record: JarvisTokenizedChatRecord): JarvisTokenizedChatRecord {
  if (record.settlement !== "quoted") throw new Error("only a quoted chat record can require approval");
  return { ...record, settlement: "approval-required" };
}
