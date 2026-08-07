# JARVIS token structure

`/token` is the canonical source tree for JARVIS token identity and policy. The platform may consume these artifacts, but network adapters and bridge orchestration remain outside this directory.

```text
token/
├── README.md
├── TOKENOMICS.md
├── STRUCTURE.md
├── tsconfig.json
├── assets/
│   ├── jarvis-green.png
│   ├── jarvis-logo-dark.png
│   ├── jarvis-logo-light.png
│   └── generated/                 # deterministic PNG/WebP runtime sizes
├── common/                        # provider-neutral types
├── constants/                     # frozen identity, supply, route constants
├── context/                       # environment/deployment context
├── data/                          # derived registry/index data
├── database/
│   └── schemas/                   # portable persistence schemas
├── functions/                     # pure token business functions
├── security/                      # activation, authority, secret policy
├── storage/                       # provider-neutral storage contracts
├── ui/                            # presentation policy and token CSS
├── utils/                         # amount, identity, digest helpers
├── validation/                    # runtime asset-model validation
├── config/
│   ├── asset.json
│   ├── tokenomics.policy.json
│   ├── allocation-policy.json
│   └── treasury-policy.example.json
├── contracts/
│   ├── sui-mainnet/
│   └── sui-testnet/
├── programs/
│   └── solana/
├── metadata/
│   ├── metadata.json
│   ├── sui.json
│   ├── solana.json
│   ├── security.json
│   ├── logo-manifest.json
│   ├── asset-manifest.json
│   └── integrity-manifest.json
├── docs/
│   ├── tokenomics.md
│   └── tokenomics-enforcement.md
└── scripts/
    ├── build-icons.py
    ├── generate-asset-manifest.mjs
    ├── generate-registry.mjs
    ├── generate-integrity-manifest.mjs
    ├── validate-schemas.mjs
    ├── verify-assets.mjs
    ├── verify-integrity.mjs
    ├── sync-assets.sh
    ├── security-audit.mjs
    └── validate-token.mjs
```

## Ownership boundaries

- **Canonical supply and issuance:** `contracts/sui-mainnet`.
- **Official Solana representation profile:** `programs/solana`.
- **Bridge execution:** root `contracts/jarvis_bridge`, `programs/solana-jarvis-bridge`, Bridge domain, and Wormhole infrastructure adapter.
- **Public token identity:** `config/asset.json`, `metadata/metadata.json`, and `constants/`.
- **Platform database implementation:** root `/prisma`; token-domain portable record contracts live in `database/schemas/`.
- **Runtime artwork:** generated/synchronized from `assets/`; runtime copies are not authoritative.

Private keys, recovery phrases, authority keypairs, provider secrets, and Sui keystore files must never be stored here.

### Runtime monitoring

```text
token/services/
├── ports.ts
└── monitoring.ts

token/security/
└── runtime-gate.ts

apps/bridge/lib/token-monitoring/
├── rpc-observer.ts
└── runtime.ts
```

The domain owns verification and safety decisions; application/infrastructure code owns RPC calls.


## Tokenomics enforcement ownership

- `functions/allocation.ts` — exact allocation reconciliation and commitment.
- `functions/allocation-claims.ts` — beneficiary binding, vesting ceiling and replay guards.
- `functions/vesting.ts` — immediate, linear and milestone vesting arithmetic.
- `functions/treasury.ts` — approval, timelock, limit, purpose and execution policy.
- `functions/circulation.ts` — explicit restricted/circulating supply accounting.
- `services/tokenomics.ts` — application-facing orchestration and repository contract.
- `database/schemas/` — portable allocation, claim, vesting and treasury records.
- root `prisma/` — platform persistence implementation and migrations.
