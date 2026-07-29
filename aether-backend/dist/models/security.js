"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
/* -------------------------------------------------------------------------- */
/* API KEY SCHEMA                                                             */
/* -------------------------------------------------------------------------- */
const ApiKeySchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    purpose: {
        type: [String],
        enum: [
            "cli",
            "github_actions",
            "ci_cd",
            "custom",
        ],
        required: true,
        default: ["custom"],
    },
    key: {
        type: String,
        required: true,
        unique: true,
    },
    /* ---------------------------- TOKEN USAGE ----------------------------- */
    tokensUsed: {
        type: Number,
        default: 0,
        min: 0,
    },
    tokenLimit: {
        type: Number,
        required: true,
        min: 1000,
    },
    /* -------------------------- SPENDING USAGE ---------------------------- */
    /**
     * Stored in cents.
     *
     * Example:
     * spendingUsed: 250  => $2.50
     * spendingLimit: 500 => $5.00
     */
    spendingUsed: {
        type: Number,
        default: 0,
        min: 0,
    },
    spendingLimit: {
        type: Number,
        required: true,
        min: 1,
    },
    /* ----------------------------- RATE LIMIT ----------------------------- */
    /**
     * Maximum requests allowed per minute.
     */
    rateLimit: {
        type: Number,
        required: true,
        min: 1,
    },
    /* ------------------------------- META -------------------------------- */
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastUsed: {
        type: Date,
    },
}, {
    _id: false,
});
/* -------------------------------------------------------------------------- */
/* SESSION SCHEMA                                                             */
/* -------------------------------------------------------------------------- */
const SessionSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
    },
    device: {
        type: String,
        required: true,
    },
    browser: {
        type: String,
        required: true,
    },
    ip: {
        type: String,
        required: true,
    },
    lastActive: {
        type: Date,
        default: Date.now,
    },
    current: {
        type: Boolean,
        default: false,
    },
}, {
    _id: false,
});
/* -------------------------------------------------------------------------- */
/* SECURITY SCHEMA                                                            */
/* -------------------------------------------------------------------------- */
const SecuritySchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false,
    },
    twoFactorSecret: {
        type: String,
        select: false,
    },
    apiKeys: {
        type: [ApiKeySchema],
        default: [],
    },
    sessions: {
        type: [SessionSchema],
        default: [],
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("Security", SecuritySchema);
