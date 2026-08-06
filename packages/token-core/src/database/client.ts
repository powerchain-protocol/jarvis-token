import { PrismaClient } from "@prisma/client";
import { loadDatabaseConfiguration } from "./config.js";

let sharedClient: PrismaClient | undefined;

/** Creates a lazy Prisma client after fail-closed environment validation. */
export function getDatabaseClient(): PrismaClient {
  loadDatabaseConfiguration();
  sharedClient ??= new PrismaClient({ log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"] });
  return sharedClient;
}

export async function disconnectDatabase(): Promise<void> {
  if (sharedClient) await sharedClient.$disconnect();
  sharedClient = undefined;
}
