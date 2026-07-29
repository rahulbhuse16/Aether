import { Router } from "express";
import {
  getSecuritySettings,
  updateTwoFactorAuth,
  createApiKey,
  deleteApiKey,
  revokeSession,
} from "../controller/security";
import { verifyJWT } from "../middleware/auth";

const securityRouter = Router();

securityRouter.get("/:userId", verifyJWT, getSecuritySettings);
securityRouter.patch("/:userId/2fa", verifyJWT, updateTwoFactorAuth);
securityRouter.post("/:userId/api-keys", verifyJWT, createApiKey);
securityRouter.delete("/:userId/api-keys/:apiKeyId", verifyJWT, deleteApiKey);
securityRouter.delete("/:userId/sessions/:sessionId", verifyJWT, revokeSession);

export default securityRouter;
