/**
 * -----------------------------------------------------------------------
 * MERGE INTO YOUR EXISTING controllers/auth.ts
 *
 * These are additional exported functions, not a new controller file —
 * add them alongside your existing login/register/session methods and
 * import User, any existing "current authenticated user" helper, and the
 * models/utils below into the top of auth.ts.
 *
 * ASSUMPTIONS (adjust to match your real code):
 * - `req.user` is populated by your existing session/login middleware
 *   when the browser has a valid Aether session. authorize() checks for
 *   its absence and redirects to login rather than 401ing, per the spec.
 * - Your existing login page accepts a `redirect` query param and sends
 *   the browser back there after successful login. If it uses a
 *   different param name, update the two places below that build that URL.
 * - FRONTEND_URL is available from your existing ENV config.
 * -----------------------------------------------------------------------
 */

import { Request, Response } from "express";
import { OAuthClient } from "../models/oauth";
import {
  OAuthSession,
  AuthorizationCode,
  OAuthAccessToken,
  OAuthConsent,
} from "../models/oauth";
import {
  SUPPORTED_SCOPES,
  isValidScopeList,
  generateClientId,
  generateClientSecret,
  generateRequestId,
  generateAuthorizationCode,
  generateOpaqueToken,
  hashSecret,
  timingSafeEqualStrings,
} from "../utils/oauth";
import { ENV } from "../config/env";
import security from "../models/security";
import { User } from "../models/user";

const { FRONTEND_URL } = ENV;

const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes — standard short-lived code
const CONSENT_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete consent
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const SCOPE_LABELS: Record<string, string> = {
  profile: "View your profile information",
  projects: "View and manage your projects",
  repositories: "Access your connected repositories",
  notifications: "Read your notifications",
  ai_reports: "View AI-generated reports and analyses",
  bugs: "View and manage bug reports",
  architecture: "View architecture analyses",
  chat: "Access chat/conversation data",
  workflows: "View and trigger workflows",
  usage: "View usage and billing data",
  security: "View security-related data",
};

/* ======================================================================
 * OAuth flow: authorize -> consent -> token exchange -> refresh/revoke
 * ====================================================================== */

/** GET /oauth/authorize */
export async function authorize(req: Request, res: Response) {
  try {
    const {
      client_id,
      redirect_uri,
      scope,
      state,
      response_type,
      api_key,
    } = req.query;


    if (response_type !== "code") {
      return res.status(400).json({
        success: false,
        message: "response_type must be 'code'",
      });
    }


    if (
      typeof client_id !== "string" ||
      typeof redirect_uri !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "client_id and redirect_uri are required",
      });
    }


    const client = await OAuthClient.findOne({
      clientId: client_id,
      isActive: true,
    });


    if (!client) {
      return res.status(400).json({
        success: false,
        message: "Unknown or inactive client",
      });
    }


    if (!client.redirectUris.includes(redirect_uri)) {
      return res.status(400).json({
        success: false,
        message: "redirect_uri is not registered for this client",
      });
    }


    const requestedScopes =
      typeof scope === "string"
        ? scope.split(" ").filter(Boolean)
        : [];


    if (!isValidScopeList(requestedScopes)) {
      return res.status(400).json({
        success: false,
        message: "One or more scopes are invalid",
      });
    }


    const disallowed = requestedScopes.filter(
      (s) => !client.allowedScopes.includes(s)
    );


    if (disallowed.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Client is not allowed to request scope(s): ${disallowed.join(", ")}`,
      });
    }



    /**
     * ----------------------------------------------------
     * Resolve Current User
     *
     * Priority:
     * 1. API Key authentication
     * 2. Existing browser session
     * ----------------------------------------------------
     */

    let currentUser: any = null;


    if (
      api_key &&
      typeof api_key === "string"
    ) {

      const Security = await security.findOne({
        "apiKeys.key": api_key,
      });


      if (!Security) {
        return res.status(401).json({
          success: false,
          message: "Invalid API key",
        });
      }


      const matchedApiKey =
        Security.apiKeys.find(
          (item) => item.key === api_key
        );


      if (!matchedApiKey) {
        return res.status(401).json({
          success: false,
          message: "Invalid API key",
        });
      }


      // update usage metadata
      matchedApiKey.lastUsed = new Date();

      await Security.save();


      currentUser = await User.findById(
        Security.userId
      );


      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: "User associated with API key not found",
        });
      }

    } else {

      // Browser/session authentication
      currentUser = (req as any).user;

    }



    /**
     * No authentication found
     */
    if (!currentUser) {

      const returnTo = encodeURIComponent(
        req.originalUrl
      );

      return res.redirect(
        `${FRONTEND_URL}/auth?redirect=${returnTo}`
      );
    }



    /**
     * Check existing consent
     */
    


   



    /**
     * Create OAuth consent session
     */
    const requestId =
      generateRequestId();


    await OAuthSession.create({

      requestId,

      user: currentUser._id,

      client: client._id,

      redirectUri: redirect_uri,

      scopes: requestedScopes,

      state:
        typeof state === "string"
          ? state
          : undefined,

      approved:false,

      expiresAt:
        new Date(
          Date.now() +
          CONSENT_SESSION_TTL_MS
        ),
    });



    return res.redirect(
      `${FRONTEND_URL}/oauth/consent/${requestId}`
    );


  } catch(error) {

    console.error(
      "[oauth.authorize]",
      error
    );


    return res.status(500).json({
      success:false,
      message:"Failed to start authorization",
    });

  }
}

/** GET /oauth/consent/:requestId — fetches details for Consent.tsx to render */
export async function getConsent(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
      console.log("getConsent",currentUser)

    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const session = await OAuthSession.findOne({ requestId: req.params.requestId });
    if (!session || session.expiresAt < new Date()) {
      return res.status(404).json({ success: false, message: "Authorization request not found or expired" });
    }
    if (session.user.toString() !== currentUser) {
      return res.status(403).json({ success: false, message: "This authorization request belongs to a different user" });
    }

    const client = await OAuthClient.findById(session.client);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        requestId: session.requestId,
        client: {
          name: client.name,
          description: client.description ?? null,
          logo: client.logo ?? null,
          website: client.website ?? null,
        },
        scopes: session.scopes.map((s) => ({ scope: s, label: SCOPE_LABELS[s] ?? s })),
        redirectUri: session.redirectUri,
      },
    });
  } catch (error) {
    console.error("[oauth.getConsent]", error);
    return res.status(500).json({ success: false, message: "Failed to load authorization request" });
  }
}

/** POST /oauth/consent/:requestId  body: { approve: boolean } */
export async function approveConsent(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const session = await OAuthSession.findOne({ requestId: req.params.requestId });
    if (!session || session.expiresAt < new Date()) {
      return res.status(404).json({ success: false, message: "Authorization request not found or expired" });
    }
    if (session.user.toString() !== currentUser.toString()) {
      return res.status(403).json({ success: false, message: "This authorization request belongs to a different user" });
    }

    const { approve } = req.body;

    if (!approve) {
      const denyUrl = new URL(session.redirectUri);
      denyUrl.searchParams.set("error", "access_denied");
      if (session.state) denyUrl.searchParams.set("state", session.state);
      await OAuthSession.deleteOne({ _id: session._id });
      return res.status(200).json({ success: true, data: { redirectUrl: denyUrl.toString() } });
    }

    await OAuthConsent.findOneAndUpdate(
      { user: session.user, client: session.client },
      { $set: { scopes: session.scopes, grantedAt: new Date(), revoked: false } },
      { upsert: true }
    );

    const redirectUrl = await issueAuthorizationCodeRedirect({
      userId: session.user?.toString(),
      clientId: session.client?.toString(),
      redirectUri: session.redirectUri,
      scopes: session.scopes,
      state: session.state,
    });

    session.approved = true;
    await session.save();
    await OAuthSession.deleteOne({ _id: session._id }); // single-use

    return res.status(200).json({ success: true, data: { redirectUrl } });
  } catch (error) {
    console.error("[oauth.approveConsent]", error);
    return res.status(500).json({ success: false, message: "Failed to record consent" });
  }
}

async function issueAuthorizationCodeRedirect(args: {
  userId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state?: string;
}): Promise<string> {
  const code = generateAuthorizationCode();
  await AuthorizationCode.create({
    codeHash: hashSecret(code),
    user: args.userId,
    client: args.clientId,
    redirectUri: args.redirectUri,
    scopes: args.scopes,
    used: false,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });

  const url = new URL(args.redirectUri);
  url.searchParams.set("code", code);
  if (args.state) url.searchParams.set("state", args.state);
  return url.toString();
}

/** POST /oauth/token  body: { grant_type: "authorization_code", code, client_id, client_secret, redirect_uri } */
export async function exchangeToken(req: Request, res: Response) {
  try {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

    if (grant_type !== "authorization_code") {
      return res.status(400).json({ success: false, message: "Unsupported grant_type" });
    }
    if (!code || !client_id || !client_secret || !redirect_uri) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    const client = await authenticateClient(client_id, client_secret);
    if (!client) {
      return res.status(401).json({ success: false, message: "Invalid client credentials" });
    }

    const authCode = await AuthorizationCode.findOne({ codeHash: hashSecret(code) });
    if (
      !authCode ||
      authCode.used ||
      authCode.expiresAt < new Date() ||
      authCode.client.toString() !== client._id.toString() ||
      authCode.redirectUri !== redirect_uri
    ) {
      return res.status(400).json({ success: false, message: "Invalid or expired authorization code" });
    }

    authCode.used = true;
    await authCode.save();

    const tokens = await issueTokenPair({
      userId: authCode.user.toString(),
      clientId: client._id.toString(),
      scopes: authCode.scopes,
    });

    return res.status(200).json({ success: true, data: tokens });
  } catch (error) {
    console.error("[oauth.exchangeToken]", error);
    return res.status(500).json({ success: false, message: "Failed to exchange token" });
  }
}

/** POST /oauth/token/refresh  body: { grant_type: "refresh_token", refresh_token, client_id, client_secret } */
export async function refreshToken(req: Request, res: Response) {
  try {
    const { grant_type, refresh_token, client_id, client_secret } = req.body;

    if (grant_type !== "refresh_token") {
      return res.status(400).json({ success: false, message: "Unsupported grant_type" });
    }
    if (!refresh_token || !client_id || !client_secret) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    const client = await authenticateClient(client_id, client_secret);
    if (!client) {
      return res.status(401).json({ success: false, message: "Invalid client credentials" });
    }

    const existing = await OAuthAccessToken.findOne({
      refreshTokenHash: hashSecret(refresh_token),
      client: client._id,
    });
    if (!existing || existing.revoked || existing.refreshTokenExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired refresh token" });
    }

    // Rotation: revoke the old pair, issue a fresh one.
    existing.revoked = true;
    await existing.save();

    const tokens = await issueTokenPair({
      userId: existing.user.toString(),
      clientId: client._id.toString(),
      scopes: existing.scopes,
    });

    return res.status(200).json({ success: true, data: tokens });
  } catch (error) {
    console.error("[oauth.refreshToken]", error);
    return res.status(500).json({ success: false, message: "Failed to refresh token" });
  }
}

/** POST /oauth/revoke  body: { token, client_id, client_secret } — RFC 7009 */
export async function revokeToken(req: Request, res: Response) {
  try {
    const { token, client_id, client_secret } = req.body;
    if (!token || !client_id || !client_secret) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    const client = await authenticateClient(client_id, client_secret);
    if (!client) {
      // RFC 7009: still respond 200 to avoid leaking whether a client is valid.
      return res.status(200).json({ success: true });
    }

    const hash = hashSecret(token);
    await OAuthAccessToken.updateMany(
      { client: client._id, $or: [{ accessTokenHash: hash }, { refreshTokenHash: hash }] },
      { $set: { revoked: true } }
    );

    // Always 200, whether or not a matching token was found — same reasoning.
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[oauth.revokeToken]", error);
    return res.status(200).json({ success: true });
  }
}

async function authenticateClient(clientId: string, clientSecret: string) {
  const client = await OAuthClient.findOne({ clientId, isActive: true });
  if (!client) return null;
  const matches = timingSafeEqualStrings(hashSecret(clientSecret), client.clientSecretHash);
  return matches ? client : null;
}

async function issueTokenPair(args: { userId: string; clientId: string; scopes: string[] }) {
  const accessToken = generateOpaqueToken("at");
  const refreshTokenValue = generateOpaqueToken("rt");
  const now = Date.now();

  await OAuthAccessToken.create({
    accessTokenHash: hashSecret(accessToken),
    refreshTokenHash: hashSecret(refreshTokenValue),
    user: args.userId,
    client: args.clientId,
    scopes: args.scopes,
    revoked: false,
    accessTokenExpiresAt: new Date(now + ACCESS_TOKEN_TTL_MS),
    refreshTokenExpiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
  });

  return {
    access_token: accessToken,
    refresh_token: refreshTokenValue,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scope: args.scopes.join(" "),
  };
}

/* ======================================================================
 * OAuth client management — NOT in the spec's explicit 6-route list, but
 * required for OAuthClients.tsx to function. Mounted under /oauth/clients.
 * These should sit behind your existing "logged in" auth middleware
 * (standard protected-route auth, not the special authorize() bounce).
 * ====================================================================== */

/** POST /oauth/clients */
export async function registerOAuthClient(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    console.log("currentUser",currentUser)
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, description, redirectUris, allowedScopes, logo, website } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "name is required" });
    }
    if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
      return res.status(400).json({ success: false, message: "At least one redirect URI is required" });
    }
    if (allowedScopes !== undefined && !isValidScopeList(allowedScopes)) {
      return res.status(400).json({ success: false, message: "One or more scopes are invalid" });
    }

    const clientSecret = generateClientSecret();

    const client = await OAuthClient.create({
      name: name.trim(),
      description,
      clientId: generateClientId(),
      clientSecretHash: hashSecret(clientSecret),
      redirectUris,
      allowedScopes: allowedScopes ?? [],
      logo,
      website,
      isActive: true,
      owner: currentUser,
    });

    // clientSecret is only ever returned here, at creation time — never again.
    return res.status(201).json({
      success: true,
      data: { ...serializeClient(client), clientSecret },
    });
  } catch (error) {
    console.error("[oauth.registerOAuthClient]", error);
    return res.status(500).json({ success: false, message: "Failed to register client" });
  }
}

/** GET /oauth/clients?search=&page=&limit= */
export async function listOAuthClients(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 10);

    const filter: Record<string, unknown> = { owner: currentUser };
    if (search) {
      filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const [clients, total] = await Promise.all([
      OAuthClient.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      OAuthClient.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { clients: clients.map(serializeClient), total, page, limit },
    });
  } catch (error) {
    console.error("[oauth.listOAuthClients]", error);
    return res.status(500).json({ success: false, message: "Failed to list clients" });
  }
}

/** PATCH /oauth/clients/:clientId */
export async function updateOAuthClient(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, description, redirectUris, allowedScopes, logo, website, isActive } = req.body;

    if (allowedScopes !== undefined && !isValidScopeList(allowedScopes)) {
      return res.status(400).json({ success: false, message: "One or more scopes are invalid" });
    }
    if (redirectUris !== undefined && (!Array.isArray(redirectUris) || redirectUris.length === 0)) {
      return res.status(400).json({ success: false, message: "At least one redirect URI is required" });
    }

    const client = await OAuthClient.findOneAndUpdate(
      { _id: req.params.clientId, owner: currentUser },
      { $set: { name, description, redirectUris, allowedScopes, logo, website, isActive } },
      { new: true, omitUndefined: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    return res.status(200).json({ success: true, data: serializeClient(client) });
  } catch (error) {
    console.error("[oauth.updateOAuthClient]", error);
    return res.status(500).json({ success: false, message: "Failed to update client" });
  }
}

/** PATCH /oauth/clients/:clientId/toggle — enable/disable */
export async function toggleOAuthClientActive(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const client = await OAuthClient.findOne({ _id: req.params.clientId, owner: currentUser });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    client.isActive = !client.isActive;
    await client.save();

    return res.status(200).json({ success: true, data: serializeClient(client) });
  } catch (error) {
    console.error("[oauth.toggleOAuthClientActive]", error);
    return res.status(500).json({ success: false, message: "Failed to toggle client" });
  }
}

/** POST /oauth/clients/:clientId/rotate-secret */
export async function rotateOAuthClientSecret(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const client = await OAuthClient.findOne({ _id: req.params.clientId, owner: currentUser });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const clientSecret = generateClientSecret();
    client.clientSecretHash = hashSecret(clientSecret);
    await client.save();

    // Revoke every existing token for this client — a rotated secret
    // implies the old one may be compromised; don't leave old sessions
    // valid under a secret that's meant to have been replaced.
    await OAuthAccessToken.updateMany({ client: client._id }, { $set: { revoked: true } });

    return res.status(200).json({ success: true, data: { clientSecret } });
  } catch (error) {
    console.error("[oauth.rotateOAuthClientSecret]", error);
    return res.status(500).json({ success: false, message: "Failed to rotate client secret" });
  }
}

/** DELETE /oauth/clients/:clientId */
export async function deleteOAuthClient(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const client = await OAuthClient.findOneAndDelete({
      _id: req.params.clientId,
      owner: currentUser,
    });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    await Promise.all([
      OAuthAccessToken.updateMany({ client: client._id }, { $set: { revoked: true } }),
      OAuthConsent.updateMany({ client: client._id }, { $set: { revoked: true } }),
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[oauth.deleteOAuthClient]", error);
    return res.status(500).json({ success: false, message: "Failed to delete client" });
  }
}

function serializeClient(client: InstanceType<typeof OAuthClient>) {
  return {
    id: client._id.toString(),
    name: client.name,
    description: client.description ?? null,
    clientId: client.clientId,
    redirectUris: client.redirectUris,
    allowedScopes: client.allowedScopes,
    logo: client.logo ?? null,
    website: client.website ?? null,
    isActive: client.isActive,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

export { SUPPORTED_SCOPES };