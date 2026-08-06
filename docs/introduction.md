# Introduction

JARVIS is a fixed-supply cross-chain utility token. Its one canonical supply is
created on Sui: 18,440,000,000 JARVIS with six decimals. The Sui package mints
the entire supply once, sends it to the configured treasury, and destroys the
TreasuryCap so no additional canonical units can ever be created.

Solana JARVIS is a wrapped Token-2022 representation. It begins with zero
supply. Wormhole Native Token Transfers (NTT) may mint wrapped units only after
the corresponding canonical units are locked on Sui. Returning to Sui burns
wrapped units before releasing canonical units.

“Mintable” therefore means bridge-mintable and fully collateralized—not an
administrator-controlled inflation function. The global maximum never changes.

This release candidate contains contract source, unsigned transaction planning, validation,
read-only verification, metadata, assets, and operational guidance. It does not
contain private keys or a broadcasting path, and it does not claim a mainnet
deployment or audit.
