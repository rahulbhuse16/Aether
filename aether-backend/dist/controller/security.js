"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSession = exports.deleteApiKey = exports.createApiKey = exports.updateTwoFactorAuth = exports.getSecuritySettings = void 0;
const crypto_1 = __importDefault(require("crypto"));
const security_1 = __importDefault(require("../models/security"));
const VALID_PURPOSES = [
    "cli",
    "github_actions",
    "ci_cd",
    "custom",
];
/* -------------------------------------------------------------------------- */
/* GET SECURITY SETTINGS                                                      */
/* -------------------------------------------------------------------------- */
const getSecuritySettings = async (req, res) => {
    try {
        const userId = req.params.userId;
        let security = await security_1.default.findOne({
            userId,
        });
        if (!security) {
            security = await security_1.default.create({
                userId,
                twoFactorEnabled: false,
                apiKeys: [],
                sessions: [],
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                twoFactorEnabled: security.twoFactorEnabled,
                apiKeys: security.apiKeys,
                sessions: security.sessions,
            },
        });
    }
    catch (error) {
        console.error("getSecuritySettings error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch security settings",
        });
    }
};
exports.getSecuritySettings = getSecuritySettings;
/* -------------------------------------------------------------------------- */
/* UPDATE TWO-FACTOR AUTHENTICATION                                           */
/* -------------------------------------------------------------------------- */
const updateTwoFactorAuth = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { twoFactorEnabled } = req.body;
        if (typeof twoFactorEnabled !==
            "boolean") {
            return res.status(400).json({
                success: false,
                message: "twoFactorEnabled must be a boolean",
            });
        }
        let security = await security_1.default.findOne({
            userId,
        });
        if (!security) {
            security = await security_1.default.create({
                userId,
                twoFactorEnabled,
                apiKeys: [],
                sessions: [],
            });
        }
        else {
            security.twoFactorEnabled =
                twoFactorEnabled;
            await security.save();
        }
        return res.status(200).json({
            success: true,
            message: "Two-factor authentication updated successfully",
            data: {
                twoFactorEnabled: security.twoFactorEnabled,
                apiKeys: security.apiKeys,
                sessions: security.sessions,
            },
        });
    }
    catch (error) {
        console.error("updateTwoFactorAuth error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update 2FA settings",
        });
    }
};
exports.updateTwoFactorAuth = updateTwoFactorAuth;
/* -------------------------------------------------------------------------- */
/* CREATE API KEY                                                             */
/* -------------------------------------------------------------------------- */
const createApiKey = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { name, purpose = ["custom"], tokenLimit = 100000, spendingLimit = 500, rateLimit = 60, } = req.body;
        /* ------------------------------ NAME --------------------------------- */
        if (!name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "API key name is required",
            });
        }
        /* ---------------------------- PURPOSE -------------------------------- */
        if (!Array.isArray(purpose) ||
            purpose.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one API key purpose is required",
            });
        }
        const hasInvalidPurpose = purpose.some((item) => !VALID_PURPOSES.includes(item));
        if (hasInvalidPurpose) {
            return res.status(400).json({
                success: false,
                message: "One or more API key purposes are invalid",
            });
        }
        /* ----------------------------- LIMITS -------------------------------- */
        if (typeof tokenLimit !== "number" ||
            tokenLimit < 1000) {
            return res.status(400).json({
                success: false,
                message: "Token limit must be at least 1000",
            });
        }
        if (typeof spendingLimit !== "number" ||
            spendingLimit < 1) {
            return res.status(400).json({
                success: false,
                message: "Spending limit must be greater than 0",
            });
        }
        if (typeof rateLimit !== "number" ||
            rateLimit < 1) {
            return res.status(400).json({
                success: false,
                message: "Rate limit must be greater than 0",
            });
        }
        /* --------------------------- GENERATE KEY ----------------------------- */
        const rawApiKey = `aether_sk_${crypto_1.default
            .randomBytes(32)
            .toString("hex")}`;
        const keyId = crypto_1.default
            .randomBytes(8)
            .toString("hex");
        /* ---------------------------- SECURITY -------------------------------- */
        let security = await security_1.default.findOne({
            userId,
        });
        if (!security) {
            security = await security_1.default.create({
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
        security.apiKeys.push(newApiKey);
        await security.save();
        return res.status(201).json({
            success: true,
            message: "API key created successfully",
            data: {
                apiKey: newApiKey,
            },
        });
    }
    catch (error) {
        console.error("createApiKey error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create API key",
        });
    }
};
exports.createApiKey = createApiKey;
/* -------------------------------------------------------------------------- */
/* DELETE API KEY                                                             */
/* -------------------------------------------------------------------------- */
const deleteApiKey = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { apiKeyId } = req.params;
        const security = await security_1.default.findOne({
            userId,
        });
        if (!security) {
            return res.status(404).json({
                success: false,
                message: "Security settings not found",
            });
        }
        const apiKeyExists = security.apiKeys.some((key) => key.id === apiKeyId);
        if (!apiKeyExists) {
            return res.status(404).json({
                success: false,
                message: "API key not found",
            });
        }
        security.apiKeys =
            security.apiKeys.filter((key) => key.id !== apiKeyId);
        await security.save();
        return res.status(200).json({
            success: true,
            message: "API key revoked successfully",
            data: {
                twoFactorEnabled: security.twoFactorEnabled,
                apiKeys: security.apiKeys,
                sessions: security.sessions,
            },
        });
    }
    catch (error) {
        console.error("deleteApiKey error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete API key",
        });
    }
};
exports.deleteApiKey = deleteApiKey;
/* -------------------------------------------------------------------------- */
/* REVOKE SESSION                                                             */
/* -------------------------------------------------------------------------- */
const revokeSession = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { sessionId } = req.params;
        const security = await security_1.default.findOne({
            userId,
        });
        if (!security) {
            return res.status(404).json({
                success: false,
                message: "Security settings not found",
            });
        }
        const sessionExists = security.sessions.some((session) => session.id === sessionId);
        if (!sessionExists) {
            return res.status(404).json({
                success: false,
                message: "Session not found",
            });
        }
        security.sessions =
            security.sessions.filter((session) => session.id !== sessionId);
        await security.save();
        return res.status(200).json({
            success: true,
            message: "Session revoked successfully",
            data: {
                twoFactorEnabled: security.twoFactorEnabled,
                apiKeys: security.apiKeys,
                sessions: security.sessions,
            },
        });
    }
    catch (error) {
        console.error("revokeSession error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to revoke session",
        });
    }
};
exports.revokeSession = revokeSession;
