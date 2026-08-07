import fs from "node:fs";

const read = (file) => fs.readFileSync(file,"utf8");
const json = (file) => JSON.parse(read(file));

const required = [
  "token/contracts/sui-mainnet/sources/jarvis.move",
  "token/contracts/sui-testnet/sources/jarvis.move",
  "contracts/jarvis_bridge/sources/vault.move",
  "programs/solana-jarvis-bridge/src/lib.rs",
  "token/constants/bridge.ts",
  "token/functions/bridge-policy.ts",
  "token/database/schemas/bridge-policy.schema.json",
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);

const mainnet = read("token/contracts/sui-mainnet/sources/jarvis.move");
const testnet = read("token/contracts/sui-testnet/sources/jarvis.move");
if (mainnet !== testnet) throw new Error("Canonical Sui Mainnet/Testnet source drift");

for (const needle of [
  "MAXIMUM_BASE_UNITS: u64 = 18_440_000_000_000_000",
  "treasury_into_supply",
  "public struct FixedSupply",
  "public struct GenesisReceipt",
  "public_freeze_object(genesis_receipt)",
  "is_canonical_genesis",
]) {
  if (!mainnet.includes(needle)) throw new Error(`Canonical Sui issuance invariant missing: ${needle}`);
}

const vault = read("contracts/jarvis_bridge/sources/vault.move");
for (const needle of [
  "max_transfer_amount",
  "E_TRANSFER_LIMIT",
  "E_MUST_BE_PAUSED",
  "bridge.max_transfer_amount",
  "table::contains(&bridge.redeemed",
]) {
  if (!vault.includes(needle)) throw new Error(`Sui bridge vault invariant missing: ${needle}`);
}
if (vault.includes("coin::mint(") || vault.includes("TreasuryCap")) {
  throw new Error("Bridge vault must not contain canonical token issuance authority");
}
for (const signature of ["set_transceiver", "set_rate_window", "reset_window"]) {
  const index = vault.indexOf(`fun ${signature}`);
  if (index < 0) throw new Error(`Missing Sui privileged operation: ${signature}`);
  const block = vault.slice(index,index+900);
  if (!block.includes("bridge.paused")) throw new Error(`Sui ${signature} must require paused bridge`);
}

const solana = read("programs/solana-jarvis-bridge/src/lib.rs");
for (const needle of [
  "sui_chain_id: u16",
  "source_chain_id: u16",
  "InvalidChainDomain",
  "max_transfer_amount",
  "TransferLimitExceeded",
  "MustBePausedForCriticalChange",
  'seeds = [b"receipt"',
  "NonZeroGenesisSupply",
  "FreezeAuthorityEnabled",
]) {
  if (!solana.includes(needle)) throw new Error(`Solana bridge invariant missing: ${needle}`);
}
for (const signature of ["set_transceiver", "set_rate_window", "reset_window"]) {
  const index = solana.indexOf(`fn ${signature}`);
  if (index < 0) throw new Error(`Missing Solana privileged operation: ${signature}`);
  const block = solana.slice(index,index+1000);
  if (!block.includes("MustBePausedForCriticalChange")) throw new Error(`Solana ${signature} must require paused bridge`);
}

const expectedDomains = { solana: 1, sui: 21 };
for (const file of [
  "token/config/deployments/testnet.json",
  "token/config/deployments/mainnet.json",
  "integration/bridge/wormhole/ntt.testnet.json",
  "integration/bridge/wormhole/ntt.mainnet-plan.json",
]) {
  const config = json(file);
  const domains = config.bridge?.chainDomains ?? config.chainDomains;
  if (JSON.stringify(domains) !== JSON.stringify(expectedDomains)) {
    throw new Error(`${file}: chain-domain mismatch`);
  }
  const max = BigInt(config.bridge?.maxTransferBaseUnits ?? config.maxTransferBaseUnits);
  if (max <= 0n || max > 18_440_000_000_000_000n) throw new Error(`${file}: invalid max transfer`);
}

for (const env of ["testnet","mainnet"]) {
  const profile = json(`token/config/deployments/${env}.json`);
  if (profile.schemaVersion !== 2) throw new Error(`${env}: token deployment schema must be v2`);
  if (profile.bridge.enabled !== false || profile.sui.verified !== false || profile.solana.verified !== false) {
    throw new Error(`${env}: deployment profile must remain fail closed`);
  }
  if (profile.sui.genesisReceiptObjectId !== null) throw new Error(`${env}: undeployed genesis receipt must be null`);
  if (profile.solana.suiChainId !== 21) throw new Error(`${env}: Solana source-domain binding missing`);
}

const reconcile = read("token/functions/reconciliation.ts");
if (!reconcile.includes("pendingReverseBaseUnits;")) throw new Error("Reverse-transfer reserve liability regression");

console.log("Token/contracts/programs upgrade validation passed: immutable Sui genesis evidence, bridge domain binding, replay protection, per-transfer caps, pause-gated critical changes, and fail-closed deployment profiles.");
