"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BugAnalysis = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const BugFindingSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    severity: {
        type: String,
        enum: ["critical", "high", "medium", "low", "info"],
        required: true,
    },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    category: { type: String, required: true },
    file: { type: String, required: true },
    lineStart: { type: Number, default: 0 },
    lineEnd: { type: Number, default: 0 },
    description: { type: String, required: true },
    rootCause: { type: String, required: true },
    impact: { type: String, required: true },
    fix: { type: String, required: true },
    codeSnippet: { type: String, default: "" },
    relatedFiles: { type: [String], default: [] },
}, { _id: true });
const BugAnalysisSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    repoUrl: { type: String, required: true },
    repoName: { type: String, required: true },
    owner: { type: String, required: true },
    branch: { type: String, required: true, default: "main" },
    focusPath: { type: String, default: "" },
    stackTraceContext: { type: String, default: "" },
    repositoryHealthScore: { type: Number, required: true, min: 0, max: 100 },
    summary: { type: String, required: true },
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
    findings: { type: [BugFindingSchema], default: [] },
    filesAnalyzed: { type: Number, default: 0 },
    filesSkipped: { type: Number, default: 0 },
    model: { type: String, default: "" },
    status: {
        type: String,
        enum: ["completed", "failed"],
        default: "completed",
    },
    errorMessage: { type: String, default: "" },
}, { timestamps: true });
BugAnalysisSchema.index({ user: 1, createdAt: -1 });
exports.BugAnalysis = mongoose_1.default.model("BugAnalysis", BugAnalysisSchema);
