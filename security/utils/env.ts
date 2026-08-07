export function readOptionalEnv(env: Record<string, string | undefined>, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

export function readBooleanEnv(env: Record<string, string | undefined>, key: string): boolean {
  return env[key]?.trim().toLowerCase() === "true";
}

export function readEnumEnv<const T extends readonly string[]>(
  env: Record<string, string | undefined>,
  key: string,
  allowed: T,
  fallback: T[number],
): T[number] {
  const value = readOptionalEnv(env, key);
  return value && (allowed as readonly string[]).includes(value) ? value as T[number] : fallback;
}
