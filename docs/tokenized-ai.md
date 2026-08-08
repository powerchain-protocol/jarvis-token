# JARVIS Tokenized AI Usage

JARVIS AI applications may use the token domain to account for chat, agent, tool, embedding, image, audio, and video usage without coupling token economics to a specific model provider.

## Design rules

1. **Meter first, price explicitly.** Usage records can exist without a JARVIS quote. Production rates must be supplied by an approved pricing policy.
2. **Integer accounting only.** JARVIS has six decimals and all settlement quotes are represented as integer base units.
3. **No automatic spending.** A quote is not a transaction. Wallet approval and settlement evidence are separate states.
4. **No custody.** Private keys, recovery phrases, model API keys, and RPC secrets are not part of the token domain.
5. **Auditable data.** Session ID, message ID, usage units, quote, approval state, and transaction evidence can be persisted with the provided portable schema.

## API

```ts
import {
  calculateJarvisAiUsageQuote,
  createJarvisTokenizedChatRecord,
} from "@jarvis-ai/token";

const quote = calculateJarvisAiUsageQuote(
  { promptTokens: 1200n, completionTokens: 400n, toolCalls: 1n },
  pricingPolicy,
);

const record = createJarvisTokenizedChatRecord({
  id: "usage_01",
  sessionId: "session_01",
  messageId: "message_01",
  createdAt: new Date().toISOString(),
  quotedBaseUnits: quote.totalBaseUnits,
  usage: { promptTokens: 1200n, completionTokens: 400n, toolCalls: 1n },
});
```

The token repository does not define a production AI price schedule. This is intentional: commercial pricing can change independently while the fixed JARVIS monetary policy remains stable.
