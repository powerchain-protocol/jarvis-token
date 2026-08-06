import {
  TOKEN_2022_PROGRAM_ID,
  getMetadataPointerState,
  getMint,
  getTokenMetadata,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN } from "../constants.js";

export interface VerificationCheck {
  check: string;
  passed: boolean;
  observed: string | null;
  expected: string;
}

export interface SolanaVerificationReport {
  verified: boolean;
  observedAt: string;
  mint: string;
  bridgeTokenAuthority: string;
  wrappedSupplyBaseUnits: string;
  checks: VerificationCheck[];
}

/** Read-only verification of the wrapped Solana mint. Supply backing is checked separately. */
export async function verifySolanaDeployment(
  rpcUrl: string,
  mintAddress: string,
  bridgeTokenAuthorityAddress: string,
  expectedMetadataUri: string,
): Promise<SolanaVerificationReport> {
  const connection = new Connection(rpcUrl, "confirmed");
  const mintKey = new PublicKey(mintAddress);
  const bridgeAuthority = new PublicKey(bridgeTokenAuthorityAddress);
  const mint = await getMint(connection, mintKey, "confirmed", TOKEN_2022_PROGRAM_ID);
  const metadata = await getTokenMetadata(connection, mintKey, "confirmed", TOKEN_2022_PROGRAM_ID);
  const pointer = getMetadataPointerState(mint);
  const metadataVersion = metadata?.additionalMetadata.find(([key]) => key === "version")?.[1];
  const checks: VerificationCheck[] = [
    { check: "decimals", passed: mint.decimals === TOKEN.decimals, observed: String(mint.decimals), expected: String(TOKEN.decimals) },
    { check: "supply within global cap", passed: mint.supply <= TOKEN.maximumBaseUnits, observed: mint.supply.toString(), expected: `<=${TOKEN.maximumBaseUnits}` },
    { check: "NTT mint authority", passed: mint.mintAuthority?.equals(bridgeAuthority) === true, observed: mint.mintAuthority?.toBase58() ?? null, expected: bridgeTokenAuthorityAddress },
    { check: "freeze authority absent", passed: mint.freezeAuthority === null, observed: mint.freezeAuthority?.toBase58() ?? null, expected: "null" },
    { check: "metadata pointer targets mint", passed: pointer?.metadataAddress?.equals(mintKey) === true, observed: pointer?.metadataAddress?.toBase58() ?? null, expected: mintAddress },
    { check: "metadata pointer authority revoked", passed: pointer?.authority === null, observed: pointer?.authority?.toBase58() ?? null, expected: "null" },
    { check: "metadata name", passed: metadata?.name === TOKEN.name, observed: metadata?.name ?? null, expected: TOKEN.name },
    { check: "metadata symbol", passed: metadata?.symbol === TOKEN.symbol, observed: metadata?.symbol ?? null, expected: TOKEN.symbol },
    { check: "metadata URI", passed: metadata?.uri === expectedMetadataUri, observed: metadata?.uri ?? null, expected: expectedMetadataUri },
    { check: "metadata version", passed: metadataVersion === TOKEN.version, observed: metadataVersion ?? null, expected: TOKEN.version },
    { check: "metadata authority revoked", passed: metadata?.updateAuthority === undefined, observed: metadata?.updateAuthority?.toBase58() ?? null, expected: "null" },
  ];
  return {
    verified: checks.every((check) => check.passed), observedAt: new Date().toISOString(),
    mint: mintAddress, bridgeTokenAuthority: bridgeTokenAuthorityAddress,
    wrappedSupplyBaseUnits: mint.supply.toString(), checks,
  };
}
