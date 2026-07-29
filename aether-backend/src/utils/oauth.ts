import crypto from "crypto";

export const SUPPORTED_SCOPES = [
  "profile",
  "projects",
  "repositories",
  "notifications",
  "ai_reports",
  "bugs",
  "architecture",
  "chat",
  "workflows",
  "usage",
  "security",
] as const;

export type OAuthScope = (typeof SUPPORTED_SCOPES)[number];

export function isValidScope(s: string): s is OAuthScope {
  return (SUPPORTED_SCOPES as readonly string[]).includes(s);
}

export function isValidScopeList(scopes: unknown): scopes is string[] {
  return Array.isArray(scopes) && scopes.every((s) => typeof s === "string" && isValidScope(s));
}

export function generateClientId(): string {
  return `nova_client_${crypto.randomBytes(12).toString("hex")}`;
}

/** Returned to the developer exactly once at creation/rotation time — only the hash is stored. */
export function generateClientSecret(): string {
  return `nova_secret_${crypto.randomBytes(24).toString("hex")}`;
}

export function generateRequestId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateAuthorizationCode(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function generateOpaqueToken(prefix: "at" | "rt"): string {
  return `${prefix}_${crypto.randomBytes(32).toString("hex")}`;
}

/**
 * One-way hash for storage — client secrets and access/refresh tokens are
 * never stored in plaintext, only their hash, same as a password. The raw
 * value is shown/returned to the caller exactly once.
 */
export function hashSecret(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}