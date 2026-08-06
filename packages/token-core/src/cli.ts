#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { loadDeploymentConfig } from "./config.js";
import { deploymentEvidenceSchema, releaseEvidenceSchema } from "./evidence.js";
import { writeJson } from "./io.js";
import { buildSolanaDeploymentPlan } from "./solana/plan.js";
import { verifySolanaDeployment } from "./solana/verify.js";
import { buildSuiDeploymentPlan } from "./sui/plan.js";
import { buildNttReviewPlan, loadBridgeConfig } from "./bridge/config.js";
import { verifyBridgeSnapshot } from "./bridge/invariants.js";
import { assertProductionConfiguration } from "./production.js";
import { quoteAiUsage } from "./ai/pricing.js";
import { buildAllocationCommitment, buildVestingSnapshot, validateApprovedAllocationPlan, verifyVestingSnapshot } from "./tokenomics.js";
import { databaseConfigurationSummary, loadDatabaseConfiguration } from "./database/config.js";
import { disconnectDatabase, getDatabaseClient } from "./database/client.js";
import { inspectPrismaDatabaseReadiness } from "./database/readiness.js";

const program = new Command()
  .name("jarvis-token")
  .description("Guarded JARVIS cross-chain deployment planning and verification")
  .version("1.0.0-rc.0");

program
  .command("plan-solana-wrapped")
  .requiredOption("--config <path>")
  .requiredOption("--out <path>")
  .description("Generate a zero-supply wrapped Token-2022 mint plan; never broadcasts")
  .action(async ({ config, out }: { config: string; out: string }) => {
    const parsed = await loadDeploymentConfig(config);
    const plan = await buildSolanaDeploymentPlan(parsed);
    await writeJson(out, plan);
    console.log(`Wrote Solana signing plan to ${out}`);
  });

program.command("plan-ntt")
  .requiredOption("--config <path>").requiredOption("--out <path>")
  .description("Generate a review-only Wormhole NTT rollout plan")
  .action(async ({ config, out }: { config: string; out: string }) => {
    await writeJson(out, buildNttReviewPlan(await loadBridgeConfig(config)));
    console.log(`Wrote NTT review plan to ${out}`);
  });

program.command("verify-bridge-snapshot")
  .requiredOption("--file <path>").requiredOption("--out <path>")
  .description("Check canonical, wrapped, locked, and in-flight supply invariants")
  .action(async ({ file, out }: { file: string; out: string }) => {
    const report = verifyBridgeSnapshot(JSON.parse(await readFile(file, "utf8")));
    await writeJson(out, report);
    if (!report.verified) process.exitCode = 2;
  });

program.command("validate-production-config")
  .requiredOption("--solana <path>").requiredOption("--bridge <path>")
  .description("Fail on placeholders or inconsistent mainnet identities")
  .action(async ({ solana, bridge }: { solana: string; bridge: string }) => {
    assertProductionConfiguration(
      JSON.parse(await readFile(solana, "utf8")),
      JSON.parse(await readFile(bridge, "utf8")),
    );
    console.log("Production configuration identities are internally consistent");
  });

program
  .command("verify-solana")
  .requiredOption("--rpc-url <url>")
  .requiredOption("--mint <address>")
  .requiredOption("--bridge-authority <address>")
  .requiredOption("--metadata-uri <url>")
  .requiredOption("--out <path>")
  .description("Independently inspect JARVIS Token-2022 mint state")
  .action(async (options: {
    rpcUrl: string;
    mint: string;
    bridgeAuthority: string;
    metadataUri: string;
    out: string;
  }) => {
    const report = await verifySolanaDeployment(
      options.rpcUrl,
      options.mint,
      options.bridgeAuthority,
      options.metadataUri,
    );
    await writeJson(options.out, report);
    console.log(`Verification ${report.verified ? "passed" : "failed"}: ${options.out}`);
    if (!report.verified) process.exitCode = 2;
  });

program
  .command("plan-sui")
  .requiredOption("--config <path>")
  .requiredOption("--out <path>")
  .description("Generate a guarded Sui publish review plan; never executes")
  .action(async ({ config, out }: { config: string; out: string }) => {
    const input = JSON.parse(await readFile(config, "utf8")) as unknown;
    const plan = buildSuiDeploymentPlan(input);
    await writeJson(out, plan);
    console.log(`Wrote Sui publish plan to ${out}`);
  });

program
  .command("validate-evidence")
  .requiredOption("--file <path>")
  .description("Validate a deployment evidence record without modifying it")
  .action(async ({ file }: { file: string }) => {
    const input = JSON.parse(await readFile(file, "utf8")) as unknown;
    deploymentEvidenceSchema.parse(input);
    console.log(`Valid deployment evidence: ${file}`);
  });

program.command("validate-release-evidence")
  .requiredOption("--file <path>")
  .description("Validate the complete, independently approved mainnet evidence bundle")
  .action(async ({ file }: { file: string }) => {
    releaseEvidenceSchema.parse(JSON.parse(await readFile(file, "utf8")));
    console.log(`Valid release evidence bundle: ${file}`);
  });

program.command("quote-ai-usage")
  .requiredOption("--usage <path>").requiredOption("--schedule <path>")
  .requiredOption("--quoted-at <iso-time>").requiredOption("--out <path>")
  .description("Create a deterministic, non-settling JARVIS AI usage quote")
  .action(async ({ usage, schedule, quotedAt, out }: { usage: string; schedule: string; quotedAt: string; out: string }) => {
    const quote = quoteAiUsage(
      JSON.parse(await readFile(usage, "utf8")), JSON.parse(await readFile(schedule, "utf8")), quotedAt,
    );
    await writeJson(out, quote);
  });

program.command("validate-allocation")
  .requiredOption("--file <path>")
  .description("Validate an approved allocation against fixed supply and vesting policy")
  .action(async ({ file }: { file: string }) => {
    const plan = validateApprovedAllocationPlan(JSON.parse(await readFile(file, "utf8")));
    console.log(`Valid approved allocation: ${plan.allocations.length} entries, 100.00% of fixed supply`);
  });

program.command("commit-allocation")
  .requiredOption("--file <path>").requiredOption("--out <path>")
  .description("Write a deterministic commitment and totals for an approved allocation")
  .action(async ({ file, out }: { file: string; out: string }) => {
    const report = buildAllocationCommitment(JSON.parse(await readFile(file, "utf8")));
    await writeJson(out, report);
    console.log(`Wrote allocation commitment ${report.allocationCommitmentSha256} to ${out}`);
  });

program.command("project-vesting")
  .requiredOption("--file <path>").requiredOption("--as-of <iso-time>").requiredOption("--out <path>")
  .option("--claims <path>")
  .description("Write a deterministic vested, claimed, claimable, and unvested supply snapshot")
  .action(async ({ file, asOf, out, claims }: { file: string; asOf: string; out: string; claims?: string }) => {
    const report = buildVestingSnapshot(
      JSON.parse(await readFile(file, "utf8")), asOf,
      claims ? JSON.parse(await readFile(claims, "utf8")) : [],
    );
    await writeJson(out, report);
    console.log(`Wrote vesting snapshot for ${asOf} to ${out}`);
  });

program.command("verify-vesting-snapshot")
  .requiredOption("--snapshot <path>").requiredOption("--file <path>").requiredOption("--claims <path>")
  .option("--allow-legacy-aggregate", "Allow aggregate claims without transaction evidence", false)
  .description("Recompute and verify a published vesting snapshot; strict transaction evidence is the default")
  .action(async ({ snapshot, file, claims, allowLegacyAggregate }: { snapshot: string; file: string; claims: string; allowLegacyAggregate: boolean }) => {
    const result = verifyVestingSnapshot(
      JSON.parse(await readFile(snapshot, "utf8")),
      JSON.parse(await readFile(file, "utf8")),
      JSON.parse(await readFile(claims, "utf8")),
      !allowLegacyAggregate,
    );
    console.log(`Verified vesting snapshot ${result.snapshotSha256}`);
  });

program.command("validate-database-config")
  .option("--production", "Require separated TLS runtime and migration connections", false)
  .description("Validate Neon, Supabase, or PostgreSQL connection roles without connecting or exposing credentials")
  .action(({ production }: { production: boolean }) => {
    console.log(JSON.stringify(databaseConfigurationSummary(loadDatabaseConfiguration(process.env, production)), null, 2));
  });

program.command("check-database-readiness")
  .description("Read-only check of committed migrations, expected tables, and RLS coverage")
  .action(async () => {
    try {
      const report = await inspectPrismaDatabaseReadiness(getDatabaseClient());
      console.log(JSON.stringify(report, null, 2));
      if (!report.ready) process.exitCode = 2;
    } catch {
      console.error("Database readiness inspection failed; verify connectivity and migration state");
      process.exitCode = 2;
    } finally {
      await disconnectDatabase();
    }
  });

await program.parseAsync();
