import axios from "axios";
import crypto from "crypto";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from "jose";

import { ENV } from "../config/env";
import { Response } from "express";

const {
  OIDC_ISSUER,
  OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET,
  OIDC_REDIRECT_URI,
} = ENV;

console.log(OIDC_ISSUER)

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

export interface OidcState {
  state: string;
  nonce: string;
  codeVerifier: string;
}

export interface OidcUser {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  preferred_username?: string;
}

let discoveryCache: OidcDiscovery | null = null;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Get OIDC discovery metadata.
 *
 * Keycloak:
 * /realms/{realm}/.well-known/openid-configuration
 */
export async function getOidcDiscovery(): Promise<OidcDiscovery> {
  if (discoveryCache) {
    return discoveryCache;
  }

  const discoveryUrl =
    `${OIDC_ISSUER}.well-known/openid-configuration`;

  const { data } = await axios.get<OidcDiscovery>(discoveryUrl);

  if (!data.issuer || !data.authorization_endpoint || !data.token_endpoint) {
    throw new Error("Invalid OIDC discovery document");
  }

  discoveryCache = data;

  return data;
}

/**
 * Generate cryptographically secure random string.
 */
function randomString(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * Generate PKCE code verifier.
 */
export function generateCodeVerifier(): string {
  return randomString(32);
}

/**
 * Generate PKCE S256 code challenge.
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
}

/**
 * Generate OAuth/OIDC state and nonce.
 */
export function createOidcState(): OidcState {
  return {
    state: randomString(32),
    nonce: randomString(32),
    codeVerifier: generateCodeVerifier(),
  };
}

/**
 * Build Keycloak authorization URL.
 */
export async function buildAuthorizationUrl(
  oidcState: OidcState
): Promise<string> {
  const discovery = await getOidcDiscovery();

  const codeChallenge = generateCodeChallenge(
    oidcState.codeVerifier
  );

  const params = new URLSearchParams({
    client_id: OIDC_CLIENT_ID,
    redirect_uri: OIDC_REDIRECT_URI,
    response_type: "code",

    scope: "openid profile email",

    state: oidcState.state,

    nonce: oidcState.nonce,

    code_challenge: codeChallenge,

    code_challenge_method: "S256",

    prompt: "login",
  });

  return `${discovery.authorization_endpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCode(
  code: string,
  codeVerifier: string
) {
  const discovery = await getOidcDiscovery();

  const body = new URLSearchParams({
    grant_type: "authorization_code",

    client_id: OIDC_CLIENT_ID,

    code,

    redirect_uri: OIDC_REDIRECT_URI,

    code_verifier: codeVerifier,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  /**
   * If Keycloak client authentication is confidential,
   * send client secret using Basic authentication.
   */
  if (OIDC_CLIENT_SECRET) {
    const basicCredentials = Buffer.from(
      `${OIDC_CLIENT_ID}:${OIDC_CLIENT_SECRET}`
    ).toString("base64");

    headers.Authorization = `Basic ${basicCredentials}`;
  }

  const { data } = await axios.post(
    discovery.token_endpoint,
    body.toString(),
    {
      headers,
    }
  );

  return data;
}

/**
 * Verify ID Token.
 *
 * Validates:
 *
 * - JWT signature
 * - issuer
 * - audience
 * - expiration
 * - nonce
 */
export async function verifyIdToken(
  idToken: string,
  nonce: string
): Promise<JWTPayload> {
  const discovery = await getOidcDiscovery();

  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(discovery.jwks_uri)
    );
  }

  const { payload } = await jwtVerify(
    idToken,
    jwks,
    {
      issuer: OIDC_ISSUER,
      audience: OIDC_CLIENT_ID,
    }
  );

  if (payload.nonce !== nonce) {
    throw new Error("OIDC nonce validation failed");
  }

  if (!payload.sub) {
    throw new Error("OIDC ID token does not contain subject");
  }

  return payload;
}

/**
 * Fetch UserInfo from OIDC provider.
 */
export async function getUserInfo(
  accessToken: string
): Promise<OidcUser> {
  const discovery = await getOidcDiscovery();

  if (!discovery.userinfo_endpoint) {
    throw new Error("OIDC provider does not expose UserInfo endpoint");
  }

  const { data } = await axios.get<OidcUser>(
    discovery.userinfo_endpoint,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return data;
}

/**
 * Clear discovery/JWKS cache.
 *
 * Useful during development if Keycloak configuration changes.
 */
export function clearOidcCache(): void {
  discoveryCache = null;
  jwks = null;
}

export function setOidcCookie(
  res: Response,
  name: string,
  value: string
) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
    path: "/",
  });
}