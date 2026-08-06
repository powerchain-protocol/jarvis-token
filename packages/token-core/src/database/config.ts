import { z } from "zod";

const providerSchema = z.enum(["postgresql", "neon", "supabase"]);
const placeholder = /replace|placeholder|example|password|project-ref|user:pass/i;

function parsePostgresUrl(value: string, label: string): URL {
  let parsed: URL;
  try { parsed = new URL(value); } catch (error) { throw new Error(`${label} is not a valid URL`, { cause: error }); }
  if (!(["postgres:", "postgresql:"] as string[]).includes(parsed.protocol)) throw new Error(`${label} must use PostgreSQL`);
  if (!parsed.hostname || !parsed.username || !parsed.password || placeholder.test(value)) throw new Error(`${label} contains missing or placeholder credentials`);
  return parsed;
}

export interface DatabaseConfiguration {
  provider: z.infer<typeof providerSchema>;
  runtimeUrl: string;
  directUrl: string;
  runtimeHost: string;
  directHost: string;
  pooledRuntime: boolean;
}

/** Validates connection roles without returning or logging credentials. */
export function loadDatabaseConfiguration(env: NodeJS.ProcessEnv = process.env, production = env.NODE_ENV === "production"): DatabaseConfiguration {
  const provider = providerSchema.parse(env.JARVIS_DATABASE_PROVIDER ?? "postgresql");
  const runtimeUrl = z.string().min(1).parse(env.DATABASE_URL);
  const directUrl = z.string().min(1).parse(env.DIRECT_URL);
  const runtime = parsePostgresUrl(runtimeUrl, "DATABASE_URL");
  const direct = parsePostgresUrl(directUrl, "DIRECT_URL");
  if (production && runtimeUrl === directUrl) throw new Error("production runtime and migration URLs must be separated");
  if (direct.port === "6543") throw new Error("DIRECT_URL must not use a transaction pooler");
  if (provider === "neon" && !runtime.hostname.endsWith("neon.tech")) throw new Error("Neon provider requires a neon.tech runtime host");
  if (provider === "supabase" && !runtime.hostname.endsWith("supabase.com") && !runtime.hostname.endsWith("supabase.co")) throw new Error("Supabase provider requires a Supabase runtime host");
  if (production && runtime.searchParams.get("sslmode") !== "require" && runtime.searchParams.get("sslmode") !== "verify-full") throw new Error("production DATABASE_URL must require TLS");
  if (production && direct.searchParams.get("sslmode") !== "require" && direct.searchParams.get("sslmode") !== "verify-full") throw new Error("production DIRECT_URL must require TLS");
  const pooledRuntime = runtime.hostname.includes("-pooler") || runtime.port === "6543" || runtime.hostname.includes("pooler.supabase.com");
  return { provider, runtimeUrl, directUrl, runtimeHost: runtime.hostname, directHost: direct.hostname, pooledRuntime };
}

export function databaseConfigurationSummary(config: DatabaseConfiguration) {
  return { provider: config.provider, runtimeHost: config.runtimeHost, directHost: config.directHost, pooledRuntime: config.pooledRuntime, credentialsRedacted: true } as const;
}
