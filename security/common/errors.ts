export type TokenErrorCode =
  | "INVALID_AMOUNT"
  | "INVALID_ASSET"
  | "INVALID_DEPLOYMENT"
  | "INVARIANT_VIOLATION"
  | "NOT_CONFIGURED"
  | "NOT_VERIFIED"
  | "SECURITY_POLICY_VIOLATION"
  | "STORAGE_CONFLICT";

export class JarvisTokenError extends Error {
  readonly name = "JarvisTokenError";
  readonly code: TokenErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: TokenErrorCode, message: string, details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.code = code;
    if (details) this.details = details;
  }
}
