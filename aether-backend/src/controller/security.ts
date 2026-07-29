
import { Request, Response } from "express";
import crypto from "crypto";

import Security from "../models/security";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type ApiKeyPurpose =
  | "cli"
  | "github_actions"
  | "ci_cd"
  | "custom";

const VALID_PURPOSES: ApiKeyPurpose[] = [
  "cli",
  "github_actions",
  "ci_cd",
  "custom",
];

/* -------------------------------------------------------------------------- */
/* GET SECURITY SETTINGS                                                      */
/* -------------------------------------------------------------------------- */

export const getSecuritySettings = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId;

    let security = await Security.findOne({
      userId,
    });

    if (!security) {
      security = await Security.create({
        userId,
        twoFactorEnabled: false,
        apiKeys: [],
        sessions: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        twoFactorEnabled:
          security.twoFactorEnabled,
        apiKeys: security.apiKeys,
        sessions: security.sessions,
      },
    });
  } catch (error: any) {
    console.error(
      "getSecuritySettings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch security settings",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* UPDATE TWO-FACTOR AUTHENTICATION                                           */
/* -------------------------------------------------------------------------- */

export const updateTwoFactorAuth = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId;

    const { twoFactorEnabled } =
      req.body as {
        twoFactorEnabled?: boolean;
      };

    if (
      typeof twoFactorEnabled !==
      "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "twoFactorEnabled must be a boolean",
      });
    }

    let security = await Security.findOne({
      userId,
    });

    if (!security) {
      security = await Security.create({
        userId,
        twoFactorEnabled,
        apiKeys: [],
        sessions: [],
      });
    } else {
      security.twoFactorEnabled =
        twoFactorEnabled;

      await security.save();
    }

    return res.status(200).json({
      success: true,
      message:
        "Two-factor authentication updated successfully",
      data: {
        twoFactorEnabled:
          security.twoFactorEnabled,
        apiKeys: security.apiKeys,
        sessions: security.sessions,
      },
    });
  } catch (error: any) {
    console.error(
      "updateTwoFactorAuth error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update 2FA settings",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* CREATE API KEY                                                             */
/* -------------------------------------------------------------------------- */

export const createApiKey = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId;

    const {
      name,
      purpose = ["custom"],
      tokenLimit = 100000,
      spendingLimit = 500,
      rateLimit = 60,
    } = req.body as {
      name?: string;
      purpose?: ApiKeyPurpose[];
      tokenLimit?: number;
      spendingLimit?: number;
      rateLimit?: number;
    };

    /* ------------------------------ NAME --------------------------------- */

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "API key name is required",
      });
    }

    /* ---------------------------- PURPOSE -------------------------------- */

    if (
      !Array.isArray(purpose) ||
      purpose.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one API key purpose is required",
      });
    }

    const hasInvalidPurpose =
      purpose.some(
        (item) =>
          !VALID_PURPOSES.includes(item)
      );

    if (hasInvalidPurpose) {
      return res.status(400).json({
        success: false,
        message:
          "One or more API key purposes are invalid",
      });
    }

    /* ----------------------------- LIMITS -------------------------------- */

    if (
      typeof tokenLimit !== "number" ||
      tokenLimit < 1000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Token limit must be at least 1000",
      });
    }

    if (
      typeof spendingLimit !== "number" ||
      spendingLimit < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Spending limit must be greater than 0",
      });
    }

    if (
      typeof rateLimit !== "number" ||
      rateLimit < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rate limit must be greater than 0",
      });
    }

    /* --------------------------- GENERATE KEY ----------------------------- */

    const rawApiKey = `aether_sk_${crypto
      .randomBytes(32)
      .toString("hex")}`;

    const keyId = crypto
      .randomBytes(8)
      .toString("hex");

    /* ---------------------------- SECURITY -------------------------------- */

    let security = await Security.findOne({
      userId,
    });

    if (!security) {
      security = await Security.create({
        userId,
        twoFactorEnabled: false,
        apiKeys: [],
        sessions: [],
      });
    }

    /* ---------------------------- API KEY --------------------------------- */

    const newApiKey = {
      id: keyId,
      name: name.trim(),

      purpose: [
        ...new Set(purpose),
      ],

      key: rawApiKey,

      tokensUsed: 0,
      tokenLimit,

      spendingUsed: 0,
      spendingLimit,

      rateLimit,

      createdAt: new Date(),
    };

    security.apiKeys.push(
      newApiKey
    );

    await security.save();

    return res.status(201).json({
      success: true,
      message:
        "API key created successfully",

      data: {
        apiKey: newApiKey,
      },
    });
  } catch (error: any) {
    console.error(
      "createApiKey error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create API key",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* DELETE API KEY                                                             */
/* -------------------------------------------------------------------------- */

export const deleteApiKey = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId;
    const { apiKeyId } = req.params;

    const security = await Security.findOne({
      userId,
    });

    if (!security) {
      return res.status(404).json({
        success: false,
        message:
          "Security settings not found",
      });
    }

    const apiKeyExists =
      security.apiKeys.some(
        (key) => key.id === apiKeyId
      );

    if (!apiKeyExists) {
      return res.status(404).json({
        success: false,
        message:
          "API key not found",
      });
    }

    security.apiKeys =
      security.apiKeys.filter(
        (key) => key.id !== apiKeyId
      );

    await security.save();

    return res.status(200).json({
      success: true,
      message:
        "API key revoked successfully",

      data: {
        twoFactorEnabled:
          security.twoFactorEnabled,
        apiKeys: security.apiKeys,
        sessions: security.sessions,
      },
    });
  } catch (error: any) {
    console.error(
      "deleteApiKey error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete API key",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* REVOKE SESSION                                                             */
/* -------------------------------------------------------------------------- */

export const revokeSession = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId;
    const { sessionId } = req.params;

    const security = await Security.findOne({
      userId,
    });

    if (!security) {
      return res.status(404).json({
        success: false,
        message:
          "Security settings not found",
      });
    }

    const sessionExists =
      security.sessions.some(
        (session) =>
          session.id === sessionId
      );

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        message:
          "Session not found",
      });
    }

    security.sessions =
      security.sessions.filter(
        (session) =>
          session.id !== sessionId
      );

    await security.save();

    return res.status(200).json({
      success: true,
      message:
        "Session revoked successfully",

      data: {
        twoFactorEnabled:
          security.twoFactorEnabled,
        apiKeys: security.apiKeys,
        sessions: security.sessions,
      },
    });
  } catch (error: any) {
    console.error(
      "revokeSession error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to revoke session",
    });
  }
};

