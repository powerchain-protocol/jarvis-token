# JARVIS Token upgrade — AI usage + tokenized chat

Release target: `1.0.0-rc.0`

## Added

- `constants/source.ts` — official public repository metadata.
- `constants/bridge.ts` — provider-neutral canonical bridge policy export.
- `common/ai.ts` — AI usage, pricing-policy, and tokenized-chat record types.
- `functions/ai-usage.ts` — deterministic integer JARVIS base-unit usage quotes.
- `functions/tokenized-chat.ts` — auditable chat usage/settlement lifecycle records.
- `database/schemas/ai-usage-record.schema.json` — portable persistence contract.
- `docs/tokenized-ai.md` — integration and security rules.
- `.github/workflows/token-check.yml` — CI typecheck/tests/upgrade validation.
- `.github/CODEOWNERS` and `.github/dependabot.yml`.
- `tests/ai-usage.test.ts`.

## Validation

- `tsc -p tsconfig.json --noEmit`: passed.
- `node --experimental-strip-types --test tests/*.test.ts`: 52/52 passed.

Production AI pricing remains external policy. The token source does not invent a price, auto-spend JARVIS, or bypass wallet approval.
