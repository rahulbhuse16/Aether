"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ProjectSchema = new mongoose_1.default.Schema({
    githubRepoId: {
        type: Number,
        required: true,
    },
    owner: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    name: String,
    repo: String,
    openTasks: {
        type: Number,
        default: 0,
    },
    lastActivity: String,
    githubUpdatedAt: Date,
    // AI-generated on first index (see onboardingController.ts) — kept
    // optional/no-default so existing projects indexed before this field
    // existed just read back as undefined/empty rather than breaking.
    description: {
        type: String,
    },
    stack: {
        type: [String],
        default: [],
    },
    setupComplexity: {
        type: String,
        enum: ["low", "medium", "high"],
    },
    // Id of the webhook we registered on this repo via ensureWebhook().
    // Lets us check-before-create on reconnect and clean up on disconnect.
    githubWebhookId: {
        type: Number,
    },
}, {
    timestamps: true,
});
ProjectSchema.index({
    owner: 1,
    githubRepoId: 1,
}, {
    unique: true,
});
// Non-unique: the webhook handler looks up "every project tracking this repo"
// by githubRepoId alone (across owners), separate from the per-owner uniqueness above.
ProjectSchema.index({ githubRepoId: 1 });
exports.Project = mongoose_1.default.model("Project", ProjectSchema);
