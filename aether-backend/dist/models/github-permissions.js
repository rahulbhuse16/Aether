"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const GitHubPermissionsSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
    },
    repoAccess: {
        type: [String],
        default: [],
    },
    webhookEnabled: {
        type: Boolean,
        default: false,
    },
    commitAnalysisEnabled: {
        type: Boolean,
        default: false,
    },
    prAnalysisEnabled: {
        type: Boolean,
        default: false,
    },
    lastSync: {
        type: Date,
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("GitHubPermissions", GitHubPermissionsSchema);
