# JARVIS 20B canonical supply migration

JARVIS canonical monetary policy is now fixed at **20,000,000,000 JARVIS** with **6 decimals**, or exactly **20,000,000,000,000,000 base units**.

This is an economic-constant migration before production deployment evidence is finalized. It does not create an inflation mechanism: the Sui package still mints the complete canonical supply once during initialization, verifies `total_supply == MAXIMUM_BASE_UNITS`, then consumes the original `TreasuryCap` into the frozen `FixedSupply<JARVIS>` proof. No production mint entrypoint exists after initialization.

## Sui integer safety

The canonical amount is represented as `u64`. The release validator asserts:

```text
20,000,000,000 × 10^6 = 20,000,000,000,000,000
20,000,000,000,000,000 < 18,446,744,073,709,551,615 (u64::MAX)
```

The Move literal is therefore valid at six decimals. A change in decimals or supply must pass the same bound before release.

## Finalization order

1. Create the Sui currency and obtain `TreasuryCap<JARVIS>`.
2. Mint exactly `20,000,000,000,000,000` base units.
3. Assert the TreasuryCap reports that exact supply.
4. Seal the `TreasuryCap<JARVIS>` inside the module-private `BurnAuthority`; expose no post-genesis mint entry point and only the capped burn operation.
5. Freeze the resulting `FixedSupply<JARVIS>` and metadata.
6. Transfer the complete genesis coin for subsequent allocation/treasury distribution.

Any percentage allocation, including a future 5% bucket, is distribution of already-issued JARVIS and is **not** a trigger for TreasuryCap destruction. The TreasuryCap is consumed only after the full canonical fixed supply has been issued and verified.

## Cross-chain invariant

Solana remains a Wormhole NTT bridged representation with zero wrapped genesis supply. Bridge/NTT-controlled mint authority is required for the wrapped representation; it is not a discretionary operator mint authority.

```text
Sui circulating + Sui bridge-locked = 20,000,000,000,000,000 base units
Solana bridged supply <= Sui bridge-locked collateral
```

Forward settlement is Sui lock → Solana mint. Return settlement is Solana burn → Sui release. Deployment evidence must bind the Sui package/coin identity, Solana Token-2022 mint, NTT manager/transceiver or bridge program, wrapped mint authority, exact supply policy, SHA-256 commitment, and signer/signature evidence.
