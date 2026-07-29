import api from "../api/api";

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

export interface ConsentDetails {
  requestId: string;
  client: {
    name: string;
    description: string | null;
    logo: string | null;
    website: string | null;
  };
  scopes: { scope: string; label: string }[];
  redirectUri: string;
}

export interface OAuthClientSummary {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  redirectUris: string[];
  allowedScopes: string[];
  logo: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterClientInput {
  name: string;
  description?: string;
  redirectUris: string[];
  allowedScopes: string[];
  logo?: string; // data URL for MVP — swap for an uploaded asset URL once object storage exists
  website?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const oauthApi = api

export const oauthService = {
  /**
   * Fetches the pending authorization request's details for the consent
   * screen. Requires the user to already be logged in (authorize()
   * already redirected to login otherwise, before this page is reached).
   */
  getConsent: async (requestId: string): Promise<ConsentDetails> => {
    const { data } = await oauthApi.get<ApiEnvelope<ConsentDetails>>(
      `/oauth/consent/${requestId}`
    );
    if (!data.success || !data.data) throw new Error(data.message ?? "Failed to load request");
    return data.data;
  },

  /**
   * approve=false denies; either way the backend returns a redirectUrl
   * back to the third-party app (Nova) that the caller should navigate to.
   */
  submitConsent: async (
    requestId: string,
    approve: boolean
  ): Promise<{ redirectUrl: string }> => {
    const { data } = await oauthApi.post<ApiEnvelope<{ redirectUrl: string }>>(
      `/oauth/consent/${requestId}`,
      { approve }
    );
    if (!data.success || !data.data) throw new Error(data.message ?? "Failed to submit consent");
    return data.data;
  },

  /**
   * Exchanges an authorization code for a token pair. NOTE: per the OAuth
   * spec this call requires client_secret, which a public frontend should
   * never hold — this is only correct here because OAuthCallback.tsx is
   * Nova's callback page, i.e. Nova's own frontend making this call with
   * its own registered credentials, not Aether's frontend calling on a
   * user's behalf. If Nova's callback is actually server-side, this
   * exchange belongs there instead — worth confirming which is the case.
   */
  exchangeCodeForToken: async (params: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<{ access_token: string; refresh_token: string; expires_in: number; scope: string }> => {
    const { data } = await oauthApi.post<ApiEnvelope<any>>("/oauth/token", {
      grant_type: "authorization_code",
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    });
    if (!data.success || !data.data) throw new Error(data.message ?? "Token exchange failed");
    return data.data;
  },

  /* ---------------------------------------------------------------- */
  /* Client management                                                  */
  /* ---------------------------------------------------------------- */

  listClients: async (
    search: string,
    page: number,
    limit: number
  ): Promise<{ clients: OAuthClientSummary[]; total: number }> => {
    const { data } = await oauthApi.get<
      ApiEnvelope<{ clients: OAuthClientSummary[]; total: number; page: number; limit: number }>
    >("/oauth/clients", { params: { search, page, limit } });
    if (!data.success || !data.data) throw new Error(data.message ?? "Failed to load clients");
    return data.data;
  },

  registerClient: async (
    input: RegisterClientInput
  ): Promise<OAuthClientSummary & { clientSecret: string }> => {
    const { data } = await oauthApi.post<ApiEnvelope<OAuthClientSummary & { clientSecret: string }>>(
      "/oauth/clients",
      input
    );
    if (!data.success || !data.data) throw new Error(data.message ?? "Failed to register client");
    return data.data;
  },

  updateClient: async (
    clientId: string,
    input: Partial<RegisterClientInput> & { isActive?: boolean }
  ): Promise<OAuthClientSummary> => {
    const { data } = await oauthApi.patch<ApiEnvelope<OAuthClientSummary>>(
      `/oauth/clients/${clientId}`,
      input
    );
    if (!data.success || !data.data) throw new Error(data.message ?? "Failed to update client");
    return data.data;
  },

  toggleClientActive: async (clientId: string): Promise<OAuthClientSummary> => {
    const { data } = await oauthApi.patch<ApiEnvelope<OAuthClientSummary>>(
      `/oauth/clients/${clientId}/toggle`
    );
    if (!data.success || !data.data) throw new Error(data.message ?? "Failed to toggle client");
    return data.data;
  },

  rotateClientSecret: async (clientId: string): Promise<{ clientSecret: string }> => {
    const { data } = await oauthApi.post<ApiEnvelope<{ clientSecret: string }>>(
      `/oauth/clients/${clientId}/rotate-secret`
    );
    if (!data.success || !data.data) throw new Error(data.message ?? "Failed to rotate secret");
    return data.data;
  },

  deleteClient: async (clientId: string): Promise<void> => {
    const { data } = await oauthApi.delete<ApiEnvelope<null>>(`/oauth/clients/${clientId}`);
    if (!data.success) throw new Error(data.message ?? "Failed to delete client");
  },
};