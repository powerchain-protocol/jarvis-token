import "server-only";
export const SECURITY_HEADERS = Object.freeze({
  "content-security-policy": "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
});
