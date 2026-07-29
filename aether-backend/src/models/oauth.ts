import mongoose, { Schema, Document } from "mongoose";

export interface IOAuthClient extends Document {
  name: string;
  description?: string;
  clientId: string;
  clientSecretHash: string;
  redirectUris: string[];
  allowedScopes: string[];
  logo?: string;
  website?: string;
  isActive: boolean;
  owner: mongoose.Types.ObjectId; // the developer/admin who registered it
  createdAt: Date;
  updatedAt: Date;
}

const OAuthClientSchema = new Schema<IOAuthClient>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    clientId: { type: String, required: true, unique: true, index: true },
    clientSecretHash: { type: String, required: true },
    redirectUris: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "At least one redirect URI is required",
      },
    },
    allowedScopes: { type: [String], default: [] },
    logo: { type: String },
    website: { type: String },
    isActive: { type: Boolean, default: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

export const OAuthClient = mongoose.model<IOAuthClient>("OAuthClient", OAuthClientSchema);



/**
 * -----------------------------------------------------------------------
 * OAuthSession — created when authorize() validates a request and the
 * user needs to see the consent screen. Short-lived; the requestId is
 * what Consent.tsx uses to fetch/approve.
 * -----------------------------------------------------------------------
 */
export interface IOAuthSession extends Document {
  requestId: string;
  user: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  redirectUri: string;
  scopes: string[];
  state?: string;
  approved: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const OAuthSessionSchema = new Schema<IOAuthSession>(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    client: { type: Schema.Types.ObjectId, ref: "OAuthClient", required: true },
    redirectUri: { type: String, required: true },
    scopes: { type: [String], default: [] },
    state: { type: String },
    approved: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index — MongoDB auto-deletes the document once expiresAt passes.
OAuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthSession = mongoose.model<IOAuthSession>("OAuthSession", OAuthSessionSchema);

/**
 * -----------------------------------------------------------------------
 * AuthorizationCode — single-use, short-lived (standard: ~60-600s),
 * exchanged for a token pair via exchangeToken().
 * -----------------------------------------------------------------------
 */
export interface IAuthorizationCode extends Document {
  codeHash: string;
  user: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  redirectUri: string;
  scopes: string[];
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const AuthorizationCodeSchema = new Schema<IAuthorizationCode>(
  {
    codeHash: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    client: { type: Schema.Types.ObjectId, ref: "OAuthClient", required: true },
    redirectUri: { type: String, required: true },
    scopes: { type: [String], default: [] },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuthorizationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthorizationCode = mongoose.model<IAuthorizationCode>(
  "AuthorizationCode",
  AuthorizationCodeSchema
);

/**
 * -----------------------------------------------------------------------
 * OAuthAccessToken — opaque, hashed access + refresh token pair. Refresh
 * is rotated on every use (old pair revoked, new pair issued) — standard
 * refresh-token-rotation practice to limit the blast radius of a leaked
 * refresh token.
 * -----------------------------------------------------------------------
 */
export interface IOAuthAccessToken extends Document {
  accessTokenHash: string;
  refreshTokenHash: string;
  user: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  scopes: string[];
  revoked: boolean;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  createdAt: Date;
}

const OAuthAccessTokenSchema = new Schema<IOAuthAccessToken>(
  {
    accessTokenHash: { type: String, required: true, unique: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: "OAuthClient", required: true, index: true },
    scopes: { type: [String], default: [] },
    revoked: { type: Boolean, default: false },
    accessTokenExpiresAt: { type: Date, required: true },
    refreshTokenExpiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Not a TTL-expired collection — revoked/expired rows are kept for audit
// (security scope requires being able to show token history), just
// treated as invalid once past refreshTokenExpiresAt or revoked=true.

export const OAuthAccessToken = mongoose.model<IOAuthAccessToken>(
  "OAuthAccessToken",
  OAuthAccessTokenSchema
);

/**
 * -----------------------------------------------------------------------
 * OAuthConsent — durable record of "this user has granted this client
 * these scopes," so returning users skip the consent screen on
 * subsequent authorize() calls with an equal-or-narrower scope set.
 * -----------------------------------------------------------------------
 */
export interface IOAuthConsent extends Document {
  user: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  scopes: string[];
  grantedAt: Date;
  revoked: boolean;
}

const OAuthConsentSchema = new Schema<IOAuthConsent>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  client: { type: Schema.Types.ObjectId, ref: "OAuthClient", required: true, index: true },
  scopes: { type: [String], default: [] },
  grantedAt: { type: Date, default: Date.now },
  revoked: { type: Boolean, default: false },
});

OAuthConsentSchema.index({ user: 1, client: 1 }, { unique: true });

export const OAuthConsent = mongoose.model<IOAuthConsent>("OAuthConsent", OAuthConsentSchema);