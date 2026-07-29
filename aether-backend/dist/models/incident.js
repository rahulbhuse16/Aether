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
exports.Incident = exports.INCIDENT_SEVERITY_VALUES = exports.INCIDENT_STATUS_VALUES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.INCIDENT_STATUS_VALUES = [
    "investigating",
    "identified",
    "resolved",
];
exports.INCIDENT_SEVERITY_VALUES = [
    "low",
    "medium",
    "high",
    "critical",
];
const IncidentTimelineEntrySchema = new mongoose_1.Schema({
    at: { type: Date, required: true },
    summary: { type: String, required: true },
    source: { type: String, default: "" },
}, { _id: false });
const RelatedCommitSchema = new mongoose_1.Schema({
    sha: { type: String, required: true },
    message: { type: String, required: true },
    author: { type: String, default: "" },
    url: { type: String, default: "" },
}, { _id: false });
const IncidentAiAnalysisSchema = new mongoose_1.Schema({
    rootCause: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    evidence: { type: [String], default: [] },
    affectedComponents: { type: [String], default: [] },
    timeline: { type: [IncidentTimelineEntrySchema], default: [] },
    recommendedActions: { type: [String], default: [] },
    severity: {
        type: String,
        enum: exports.INCIDENT_SEVERITY_VALUES,
        required: true,
    },
    analyzedAt: { type: Date },
    model: { type: String, default: "" },
}, { _id: false });
const IncidentSchema = new mongoose_1.Schema({
    projectId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, default: "" },
    status: {
        type: String,
        enum: exports.INCIDENT_STATUS_VALUES,
        default: "investigating",
    },
    severity: {
        type: String,
        enum: exports.INCIDENT_SEVERITY_VALUES,
        default: "medium",
    },
    startedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    timeline: { type: [IncidentTimelineEntrySchema], default: [] },
    relatedEvents: { type: [String], default: [] },
    relatedCommits: { type: [RelatedCommitSchema], default: [] },
    suspectedRootCause: { type: String, default: "" },
    rootCauseConfidence: { type: Number, min: 0, max: 100 },
    recommendedActions: { type: [String], default: [] },
    aiAnalysis: { type: IncidentAiAnalysisSchema },
}, { timestamps: true });
IncidentSchema.index({ projectId: 1, createdAt: -1 });
exports.Incident = mongoose_1.default.model("Incident", IncidentSchema);
