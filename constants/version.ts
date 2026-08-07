export const JARVIS_TOKEN_VERSION = "1.0.0-rc.0" as const;

export const JARVIS_SCHEMA_VERSIONS = Object.freeze({
  asset: 4,
  metadata: 2,
  logoManifest: 2,
  integrityManifest: 1,
  registry: 4,
  database: 1,
} as const);
