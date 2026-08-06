import {
  AuthorityType,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createSetAuthorityInstruction,
  getMintLen,
} from "@solana/spl-token";
import {
  createInitializeInstruction as createInitializeTokenMetadataInstruction,
  createUpdateFieldInstruction as createUpdateTokenMetadataFieldInstruction,
  createUpdateAuthorityInstruction as createUpdateTokenMetadataAuthorityInstruction,
  pack,
  type TokenMetadata,
} from "@solana/spl-token-metadata";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import type { DeploymentConfig } from "../config.js";
import { TOKEN } from "../constants.js";
import { assertBroadcastAllowed, publicRpcOrigin } from "../network.js";

export interface TransactionPlanStep {
  name: string;
  purpose: string;
  requiredSigners: string[];
  messageBase64: string;
}

export interface SolanaDeploymentPlan {
  schemaVersion: 1;
  generatedAt: string;
  network: DeploymentConfig["network"];
  rpcOrigin: string;
  broadcast: false;
  mint: string;
  treasury: string;
  bridgeTokenAuthority: string;
  recentBlockhash: string;
  lastValidBlockHeight: number;
  mintAccountSpace: number;
  rentExemptLamports: number;
  initialSupplyBaseUnits: "0";
  canonicalMetadata: "token-2022-mint-extension";
  authorityHandoff: {
    mechanism: "wormhole-ntt-checked-set-claim";
    expectedTokenAuthority: string;
    includedInPlan: false;
  };
  steps: TransactionPlanStep[];
  invariants: string[];
}

function publicKey(value: string, field: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch (error) {
    throw new Error(`Invalid Solana ${field}: ${value}`, { cause: error });
  }
}

function compileStep(
  name: string,
  purpose: string,
  feePayer: PublicKey,
  recentBlockhash: string,
  requiredSigners: PublicKey[],
  instructions: TransactionInstruction[],
): TransactionPlanStep {
  const transaction = new Transaction({ feePayer, recentBlockhash }).add(...instructions);
  return {
    name,
    purpose,
    requiredSigners: requiredSigners.map((signer) => signer.toBase58()),
    messageBase64: transaction.serializeMessage().toString("base64"),
  };
}

export async function buildSolanaDeploymentPlan(
  config: DeploymentConfig,
): Promise<SolanaDeploymentPlan> {
  assertBroadcastAllowed(config.network, config.broadcast);
  if (config.broadcast) {
    throw new Error("This release generates signing plans only; broadcasting is disabled.");
  }

  const connection = new Connection(config.rpcUrl, "confirmed");
  const feePayer = publicKey(config.feePayerAddress, "fee payer address");
  const mint = publicKey(config.mintAddress, "mint address");
  const mintAuthority = publicKey(config.mintAuthorityAddress, "mint authority address");
  const bridgeTokenAuthority = publicKey(config.bridgeTokenAuthorityAddress, "NTT token authority");
  const metadataAuthority = publicKey(
    config.metadata.updateAuthorityAddress,
    "metadata authority address",
  );
  const treasury = publicKey(config.treasuryAddress, "treasury address");

  const metadata: TokenMetadata = {
    mint,
    name: TOKEN.name,
    symbol: TOKEN.symbol,
    uri: config.metadata.uri,
    updateAuthority: metadataAuthority,
    additionalMetadata: [["version", TOKEN.version]],
  };
  const metadataLength = pack(metadata).length;
  const mintAccountSpace = getMintLen([ExtensionType.MetadataPointer], {
    [ExtensionType.TokenMetadata]: metadataLength,
  });
  const rentExemptLamports =
    await connection.getMinimumBalanceForRentExemption(mintAccountSpace);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const initialize = compileStep(
    "initialize-mint-and-metadata",
    "Create the Token-2022 mint, initialize the self-referential metadata pointer, and store canonical metadata on the mint.",
    feePayer,
    blockhash,
    [feePayer, mint, mintAuthority, metadataAuthority],
    [
      SystemProgram.createAccount({
        fromPubkey: feePayer,
        newAccountPubkey: mint,
        lamports: rentExemptLamports,
        space: mintAccountSpace,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMetadataPointerInstruction(
        mint,
        metadataAuthority,
        mint,
        TOKEN_2022_PROGRAM_ID,
      ),
      createInitializeMintInstruction(
        mint,
        TOKEN.decimals,
        mintAuthority,
        null,
        TOKEN_2022_PROGRAM_ID,
      ),
      createInitializeTokenMetadataInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint,
        updateAuthority: metadataAuthority,
        mint,
        mintAuthority,
        name: TOKEN.name,
        symbol: TOKEN.symbol,
        uri: config.metadata.uri,
      }),
      createUpdateTokenMetadataFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint,
        updateAuthority: metadataAuthority,
        field: "version",
        value: TOKEN.version,
      }),
    ],
  );

  const freezeMetadata = compileStep(
    "freeze-metadata",
    "Permanently revoke metadata-pointer and metadata-update authorities after independent inspection.",
    feePayer,
    blockhash,
    [feePayer, metadataAuthority],
    [
      createSetAuthorityInstruction(
        mint,
        metadataAuthority,
        AuthorityType.MetadataPointer,
        null,
        [],
        TOKEN_2022_PROGRAM_ID,
      ),
      createUpdateTokenMetadataAuthorityInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint,
        oldAuthority: metadataAuthority,
        newAuthority: null,
      }),
    ],
  );

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    network: config.network,
    rpcOrigin: publicRpcOrigin(config.rpcUrl),
    broadcast: false,
    mint: mint.toBase58(),
    treasury: treasury.toBase58(),
    bridgeTokenAuthority: bridgeTokenAuthority.toBase58(),
    recentBlockhash: blockhash,
    lastValidBlockHeight,
    mintAccountSpace,
    rentExemptLamports,
    initialSupplyBaseUnits: "0",
    canonicalMetadata: "token-2022-mint-extension",
    authorityHandoff: {
      mechanism: "wormhole-ntt-checked-set-claim",
      expectedTokenAuthority: bridgeTokenAuthority.toBase58(),
      includedInPlan: false,
    },
    steps: [initialize, freezeMetadata],
    invariants: [
      "Execute steps strictly in order.",
      "Initial Solana wrapped supply is exactly zero; this plan contains no mint-to instruction.",
      "This plan deliberately excludes mint-authority transfer.",
      "Use only the pinned upstream NTT checked set/claim workflow after independently verifying its token-authority PDA.",
      "Freeze authority is never configured.",
      "Mint authority remains bridge-controlled because lock/mint and burn/release require it.",
      "Never broadcast from this tool; signing and submission require a separately reviewed process.",
    ],
  };
}
