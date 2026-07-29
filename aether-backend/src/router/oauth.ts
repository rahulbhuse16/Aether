import { Router } from "express";
import * as authController from "../controller/oauth"; // after merging auth.oauth-additions.ts into it
import { verifyJWT } from "../middleware/auth";

export const oauthRoutes = Router();

/**
 * Flow routes — exactly as specified. authorize/getConsent/approveConsent
 * rely on your existing session middleware populating req.user; mount
 * this router wherever that middleware already runs (or apply it here
 * explicitly if it's not global).
 */
oauthRoutes.get("/oauth/authorize", authController.authorize);
oauthRoutes.get("/oauth/consent/:requestId",verifyJWT, authController.getConsent);
oauthRoutes.post("/oauth/consent/:requestId",verifyJWT, authController.approveConsent);
oauthRoutes.post("/oauth/token",verifyJWT, authController.exchangeToken);
oauthRoutes.post("/oauth/token/refresh",verifyJWT, authController.refreshToken);
oauthRoutes.post("/oauth/revoke",verifyJWT, authController.revokeToken);

/**
 * Client management — not in the original 6-route spec, added to support
 * OAuthClients.tsx. Should sit behind your normal "logged in" auth check.
 */
oauthRoutes.post("/oauth/clients",verifyJWT, authController.registerOAuthClient);
oauthRoutes.get("/oauth/clients",verifyJWT, authController.listOAuthClients);
oauthRoutes.patch("/oauth/clients/:clientId",verifyJWT, authController.updateOAuthClient);
oauthRoutes.patch("/oauth/clients/:clientId/toggle",verifyJWT, authController.toggleOAuthClientActive);
oauthRoutes.post("/oauth/clients/:clientId/rotate-secret",verifyJWT, authController.rotateOAuthClientSecret);
oauthRoutes.delete("/oauth/clients/:clientId",verifyJWT, authController.deleteOAuthClient);

export default oauthRoutes;