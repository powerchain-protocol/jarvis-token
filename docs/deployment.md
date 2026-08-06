# Deployment and rollout

## Safety model

This release generates plans and validation reports. It never loads private
keys, signs, or broadcasts. Mainnet-capable generation is intentionally guarded
and is not evidence of production readiness.

Use dedicated hardware-backed or MPC-controlled authorities, distinct deployer,
treasury, fee-payer, metadata, bridge administration, and verifier roles, and a
reviewed change ticket. Never place keys, mnemonics, keypair JSON, custody
shares, signing tokens, or credential-bearing RPC URLs in repository files.

## Testnet rollout

1. Pin Node, Sui, Move framework, Wormhole NTT, and dependency versions.
2. Run the installation checks and resolve every failing security gate.
3. Replace testnet placeholders with independently reviewed public addresses.
4. Publish `testnet-contract/jarvis` from the exact approved treasury address.
5. Verify total supply, treasury receipt, frozen metadata, and irreversible
   `TreasuryCap` destruction.
6. Generate the Solana wrapped-mint plan. Confirm Token-2022, zero initial
   supply, no freeze authority, and correct metadata.
7. Deploy the pinned upstream NTT release in Sui locking mode and Solana burning
   mode. Register only verified reciprocal peers and transceivers.
8. Independently derive the Solana token-authority PDA. Use the upstream checked
   set/claim procedure; this repository intentionally does not construct it.
9. Start both managers paused with conservative limits.
10. Exercise a small Sui-to-Solana lock/mint transfer and reconcile it.
11. Exercise the return burn/release transfer and reconcile it.
12. Test replay, duplicate attestation, wrong peer, insufficient threshold,
    pause, rate-limit exhaustion, expiry, delayed relay, and RPC disagreement.
13. Complete deployment evidence and have a separate operator verify it.

## Guarded mainnet planning

Mainnet plan generation is permitted only to support review. Keep the bridge
paused and limits at zero. Do not sign until:

- the high-severity dependency blocker is resolved or formally accepted under
  the policy in `SECURITY.md`;
- exact bytecode and framework revisions have been reviewed;
- a project-specific security review and testnet acceptance are complete;
- peer, transceiver, chain, mint, package, object, and authority identities have
  two-person verification;
- every transaction has been simulated against current finalized state;
- monitoring, incident response, multisig custody, and rollback/containment
  procedures have been exercised;
- the change owner and independent verifier approve the evidence bundle.

## Plan generation

```bash
npm run jarvis -- plan-sui \
  --config config/sui-mainnet.json \
  --out artifacts/sui-plan.json

npm run jarvis -- plan-solana-wrapped \
  --config config/mainnet.json \
  --out artifacts/solana-plan.json

npm run jarvis -- plan-ntt \
  --config config/ntt-mainnet.json \
  --out artifacts/ntt-plan.json
```

Output files are created exclusively and are never silently overwritten.
Solana plans contain unsigned message bytes and expire with their recent
blockhash. Regenerate rather than reusing stale material.

## Stop conditions

Stop the rollout if any placeholder remains; identities disagree across files;
the active Sui address differs from treasury; the NTT authority PDA differs;
genesis supply is nonzero; a freeze authority exists; simulations fail; RPCs
disagree; an audit gate fails; or supply cannot be reconciled exactly.

