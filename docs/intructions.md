# Legacy deployment instructions

> This filename preserves the requested spelling. Use the canonical,
> maintained [deployment guide](deployment.md) for current operations.

## Testnet sequence

1. Run `bash scripts/production-readiness.sh <solana-config> <ntt-config>` with
   the pinned Sui CLI installed.
2. Publish `testnet-contract/jarvis` from the approved Sui treasury address.
3. Confirm the exact Sui supply, TreasuryCap destruction, frozen metadata, and
   treasury receipt before continuing.
4. Generate the zero-supply Solana mint plan with `scripts/plan-solana.sh`.
5. Deploy official Wormhole NTT managers/transceivers: Sui locking mode and
   Solana burning mode. Register only the reciprocal verified peers.
6. Derive the NTT token-authority PDA independently, compare it byte-for-byte,
   and perform the upstream checked set/claim authority handoff.
   The local planner does not generate this authority-transfer instruction.
7. Generate the rollout review with `scripts/plan-ntt.sh`.
8. Start paused. Configure a small rate limit, then unpause through the approved
   multisig procedure.
9. Transfer a small amount Sui→Solana and redeem it. Verify equal locked and
   wrapped base units. Transfer it back and verify burn/release.
10. Test duplicate messages, delayed relay, pause, limit exhaustion, invalid
    peers, and monitoring alerts. Publish independent evidence.
11. Build `target/deployment-record.example.json` into a complete evidence
    record and run `validate-release-evidence`. A template cannot pass.

## Mainnet gate

Mainnet generation never broadcasts. Keep limits zero and managers paused.
Proceed only after exact bytecode/version review, independent audit or security
assessment, simulations, multisig custody, emergency runbook, queue monitoring,
testnet acceptance, change approval, and two-person address verification.

Never manually mint wrapped JARVIS. If the observed wrapped supply is not
explained by locked plus in-flight canonical value, pause the bridge immediately
and investigate before processing another transfer.
