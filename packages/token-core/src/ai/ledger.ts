import { jarvisAmountSchema, positiveJarvisAmountSchema } from "../amounts.js";

export type ReservationStatus = "reserved" | "settled" | "cancelled";
export interface AiReservation { id: string; idempotencyKey: string; sessionId: string; amountBaseUnits: string; status: ReservationStatus; settledBaseUnits?: string; }
export interface AiLedger { accountId: string; balanceBaseUnits: string; reservations: AiReservation[]; }

export function validateAiLedger(ledger: AiLedger): void {
  if (ledger.accountId.length < 3) throw new Error("invalid ledger account ID");
  jarvisAmountSchema.parse(ledger.balanceBaseUnits);
  const ids = new Set<string>(); const keys = new Set<string>(); let reserved = 0n;
  for (const item of ledger.reservations) {
    if ([item.id, item.idempotencyKey, item.sessionId].some((value) => value.length < 8)) throw new Error("invalid persisted reservation identity");
    positiveJarvisAmountSchema.parse(item.amountBaseUnits);
    if (ids.has(item.id) || keys.has(item.idempotencyKey)) throw new Error("duplicate persisted reservation identity");
    ids.add(item.id); keys.add(item.idempotencyKey);
    if (item.status === "settled") {
      if (item.settledBaseUnits === undefined) throw new Error("settled reservation is missing its charge");
      jarvisAmountSchema.parse(item.settledBaseUnits);
      if (BigInt(item.settledBaseUnits) > BigInt(item.amountBaseUnits)) throw new Error("persisted settlement exceeds reservation");
    } else if (item.settledBaseUnits !== undefined) throw new Error("non-settled reservation contains a charge");
    if (item.status === "reserved") reserved += BigInt(item.amountBaseUnits);
  }
  if (reserved > BigInt(ledger.balanceBaseUnits)) throw new Error("persisted reservations exceed available balance");
}

export function createAiLedger(accountId: string, balanceBaseUnits: string): AiLedger {
  if (accountId.length < 3) throw new Error("invalid account ID");
  jarvisAmountSchema.parse(balanceBaseUnits);
  return { accountId, balanceBaseUnits, reservations: [] };
}

export function reserveAiUsage(ledger: AiLedger, input: { reservationId: string; idempotencyKey: string; sessionId: string; amountBaseUnits: string }): AiLedger {
  validateAiLedger(ledger);
  positiveJarvisAmountSchema.parse(input.amountBaseUnits);
  if ([input.reservationId, input.idempotencyKey, input.sessionId].some((value) => value.length < 8)) throw new Error("reservation identifiers are too short");
  const replay = ledger.reservations.find((item) => item.idempotencyKey === input.idempotencyKey);
  if (replay) {
    if (replay.id !== input.reservationId || replay.sessionId !== input.sessionId || replay.amountBaseUnits !== input.amountBaseUnits) throw new Error("idempotency conflict");
    return ledger;
  }
  if (ledger.reservations.some((item) => item.id === input.reservationId)) throw new Error("duplicate reservation ID");
  const reserved = ledger.reservations.filter((item) => item.status === "reserved").reduce((sum, item) => sum + BigInt(item.amountBaseUnits), 0n);
  if (reserved + BigInt(input.amountBaseUnits) > BigInt(ledger.balanceBaseUnits)) throw new Error("insufficient available JARVIS balance");
  return { ...ledger, reservations: [...ledger.reservations, { id: input.reservationId, idempotencyKey: input.idempotencyKey, sessionId: input.sessionId, amountBaseUnits: input.amountBaseUnits, status: "reserved" }] };
}

export function settleAiUsage(ledger: AiLedger, reservationId: string, actualBaseUnits: string): AiLedger {
  validateAiLedger(ledger);
  jarvisAmountSchema.parse(actualBaseUnits);
  const index = ledger.reservations.findIndex((item) => item.id === reservationId);
  if (index < 0) throw new Error("unknown reservation");
  const reservation = ledger.reservations[index]!;
  if (reservation.status === "settled") {
    if (reservation.settledBaseUnits !== actualBaseUnits) throw new Error("settlement idempotency conflict");
    return ledger;
  }
  if (reservation.status !== "reserved") throw new Error("reservation is already terminal");
  if (BigInt(actualBaseUnits) > BigInt(reservation.amountBaseUnits)) throw new Error("actual charge exceeds authorized reservation");
  const updated: AiReservation = { ...reservation, status: "settled", settledBaseUnits: actualBaseUnits };
  const reservations = ledger.reservations.map((item, itemIndex) => itemIndex === index ? updated : item);
  return { ...ledger, balanceBaseUnits: (BigInt(ledger.balanceBaseUnits) - BigInt(actualBaseUnits)).toString(), reservations };
}

export function cancelAiReservation(ledger: AiLedger, reservationId: string): AiLedger {
  validateAiLedger(ledger);
  const index = ledger.reservations.findIndex((item) => item.id === reservationId);
  if (index < 0) throw new Error("unknown reservation");
  const reservation = ledger.reservations[index]!;
  if (reservation.status === "cancelled") return ledger;
  if (reservation.status !== "reserved") throw new Error("reservation is already terminal");
  return { ...ledger, reservations: ledger.reservations.map((item, itemIndex) => itemIndex === index ? { ...item, status: "cancelled" } : item) };
}

export interface TokenizedChatSession { sessionId: string; owner: string; agentId?: string; budgetBaseUnits: string; spentBaseUnits: string; turnReceipts: { turnId: string; contentDigest: string; chargeBaseUnits: string }[]; }
export function validateTokenizedChatSession(session: TokenizedChatSession): void {
  jarvisAmountSchema.parse(session.budgetBaseUnits); jarvisAmountSchema.parse(session.spentBaseUnits);
  if (session.sessionId.length < 8 || session.owner.length < 3 || (session.agentId !== undefined && session.agentId.length < 3)) throw new Error("invalid persisted chat identity");
  const turns = new Set<string>(); const digests = new Set<string>(); let spent = 0n;
  for (const receipt of session.turnReceipts) {
    jarvisAmountSchema.parse(receipt.chargeBaseUnits);
    if (receipt.turnId.length < 8 || receipt.contentDigest.length < 32) throw new Error("invalid persisted turn receipt");
    if (turns.has(receipt.turnId) || digests.has(receipt.contentDigest)) throw new Error("duplicate persisted chat turn");
    turns.add(receipt.turnId); digests.add(receipt.contentDigest); spent += BigInt(receipt.chargeBaseUnits);
  }
  if (spent !== BigInt(session.spentBaseUnits)) throw new Error("chat spent total does not match receipts");
  if (spent > BigInt(session.budgetBaseUnits)) throw new Error("persisted chat budget exceeded");
}
export function createTokenizedChatSession(input: Omit<TokenizedChatSession, "spentBaseUnits" | "turnReceipts">): TokenizedChatSession {
  jarvisAmountSchema.parse(input.budgetBaseUnits);
  if (input.sessionId.length < 8 || input.owner.length < 3) throw new Error("invalid chat session identity");
  return { ...input, spentBaseUnits: "0", turnReceipts: [] };
}
export function recordTokenizedChatTurn(session: TokenizedChatSession, receipt: { turnId: string; contentDigest: string; chargeBaseUnits: string }): TokenizedChatSession {
  validateTokenizedChatSession(session);
  jarvisAmountSchema.parse(receipt.chargeBaseUnits);
  if (receipt.turnId.length < 8 || receipt.contentDigest.length < 32) throw new Error("invalid turn receipt");
  if (session.turnReceipts.some((item) => item.turnId === receipt.turnId || item.contentDigest === receipt.contentDigest)) throw new Error("duplicate chat turn");
  const spent = BigInt(session.spentBaseUnits) + BigInt(receipt.chargeBaseUnits);
  if (spent > BigInt(session.budgetBaseUnits)) throw new Error("chat or agent budget exceeded");
  return { ...session, spentBaseUnits: spent.toString(), turnReceipts: [...session.turnReceipts, receipt] };
}
