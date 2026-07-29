import {
  Request,
  Response,
  NextFunction,
} from "express";

import Security from "../models/security";

export type ApiKeyPurpose =
  | "cli"
  | "github_actions"
  | "ci_cd"
  | "custom";

interface ApiKeyMiddlewareOptions {
  purpose?: ApiKeyPurpose;
}

/**
 * Extract API key from request
 */
const extractApiKey = (
  req: Request
): string | null => {
  const authorization =
    req.headers.authorization;

  if (
    authorization &&
    authorization.startsWith("Bearer ")
  ) {
    return authorization.replace(
      "Bearer ",
      ""
    ).trim();
  }

  const apiKey =
    req.headers["x-api-key"];

  if (typeof apiKey === "string") {
    return apiKey.trim();
  }

  return null;
};

/**
 * API Key Authentication + Usage Validation
 */
export const apiKeyMiddleware = (
  options: ApiKeyMiddlewareOptions = {}
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      /* -------------------------------------------------------------- */
      /* EXTRACT API KEY                                                */
      /* -------------------------------------------------------------- */

      const rawApiKey =
        extractApiKey(req);

      if (!rawApiKey) {
        return res.status(401).json({
          success: false,
          code: "API_KEY_REQUIRED",
          message:
            "API key is required",
        });
      }

      /* -------------------------------------------------------------- */
      /* FIND SECURITY SETTINGS                                         */
      /* -------------------------------------------------------------- */

      const security =
        await Security.findOne({
          "apiKeys.key": rawApiKey,
        });

      if (!security) {
        return res.status(401).json({
          success: false,
          code: "INVALID_API_KEY",
          message:
            "Invalid API key",
        });
      }

      /* -------------------------------------------------------------- */
      /* FIND API KEY                                                    */
      /* -------------------------------------------------------------- */

      const apiKey =
        security.apiKeys.find(
          (key) => key.key === rawApiKey
        );

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          code: "INVALID_API_KEY",
          message:
            "Invalid API key",
        });
      }

      /* -------------------------------------------------------------- */
      /* PURPOSE VALIDATION                                              */
      /* -------------------------------------------------------------- */

      if (options.purpose) {
        const hasPurpose =
          apiKey.purpose.includes(
            options.purpose
          );

        if (!hasPurpose) {
          return res.status(403).json({
            success: false,
            code: "PURPOSE_NOT_ALLOWED",
            message:
              `This API key is not authorized for ${options.purpose}`,
          });
        }
      }

      /* -------------------------------------------------------------- */
      /* TOKEN LIMIT                                                     */
      /* -------------------------------------------------------------- */

      if (
        apiKey.tokensUsed >=
        apiKey.tokenLimit
      ) {
        return res.status(429).json({
          success: false,
          code: "TOKEN_LIMIT_EXCEEDED",
          message:
            "API key token limit exceeded",
        });
      }

      /* -------------------------------------------------------------- */
      /* SPENDING LIMIT                                                  */
      /* -------------------------------------------------------------- */

      if (
        apiKey.spendingUsed >=
        apiKey.spendingLimit
      ) {
        return res.status(429).json({
          success: false,
          code: "SPENDING_LIMIT_EXCEEDED",
          message:
            "API key spending limit exceeded",
        });
      }

      /* -------------------------------------------------------------- */
      /* RATE LIMIT                                                      */
      /* -------------------------------------------------------------- */

      const now = new Date();

      const oneMinuteAgo =
        new Date(
          now.getTime() -
            60 * 1000
        );

      /**
       * This basic implementation uses
       * lastUsed as a simple rate check.
       *
       * For production-grade rate limiting,
       * use Redis.
       */

      if (
        apiKey.lastUsed &&
        apiKey.lastUsed >
          oneMinuteAgo
      ) {
        /**
         * This is NOT enough to count
         * multiple requests.
         *
         * See Redis implementation below.
         */
      }

      /* -------------------------------------------------------------- */
      /* ATTACH API KEY TO REQUEST                                       */
      /* -------------------------------------------------------------- */

      req.apiKey = {
        id: apiKey.id,
        userId: security.userId.toString(),
        name: apiKey.name,
        purpose: apiKey.purpose,

        tokensUsed: apiKey.tokensUsed,
        tokenLimit: apiKey.tokenLimit,

        spendingUsed:
          apiKey.spendingUsed,
        spendingLimit:
          apiKey.spendingLimit,

        rateLimit: apiKey.rateLimit,
      };

      /* -------------------------------------------------------------- */
      /* UPDATE LAST USED                                               */
      /* -------------------------------------------------------------- */

      apiKey.lastUsed = now;

      await security.save();

      next();
    } catch (error) {
      console.error(
        "API key middleware error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "API key validation failed",
      });
    }
  };
};