# Sui gas and resource metering

JARVIS sale and bridge code should model Sui gas using the protocol's computation and storage accounting, including storage rebates. Do not describe Sui production gas as separately user-priced memory, bandwidth, and storage markets unless the active Sui protocol documentation explicitly introduces those mechanisms.

For transaction UX:

1. fetch the network reference gas price;
2. build the exact programmable transaction block;
3. dry-run or inspect effects before wallet signing where available;
4. read the gas cost summary (`computationCost`, `storageCost`, `storageRebate`, and non-refundable storage fee fields exposed by the RPC version in use);
5. apply a bounded safety margin to the gas budget;
6. never infer final cost from object count alone;
7. confirm the transaction and effects before crediting a sale purchase or bridge action.

Cross-chain performance can benefit from Sui throughput and low latency, but bridge security must never depend on arbitrage assumptions. JARVIS bridge correctness depends on finality verification, message/nonce replay protection, exact reserve accounting, and destination execution verification.
