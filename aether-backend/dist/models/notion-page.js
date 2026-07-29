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
exports.NotionPage = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const NotionPageSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    notionPageId: { type: String, required: true },
    workspaceId: { type: String, required: true },
    title: { type: String, default: "Untitled" },
    url: { type: String, required: true },
    icon: { type: String, default: null },
    content: { type: String },
    pageType: {
        type: String,
        enum: ["meeting_notes", "adr", "documentation", "general"],
        default: "general",
    },
    lastEditedTime: { type: Date },
    archived: { type: Boolean, default: false },
    syncedAt: { type: Date, default: Date.now },
}, { timestamps: true });
// Prevents duplicate synced pages per the spec: userId + notionPageId is unique.
NotionPageSchema.index({ userId: 1, notionPageId: 1 }, { unique: true });
// Content/title search — regex-based for now (see searchNotion / getRelevantNotionContext).
// A MongoDB $text index is a natural upgrade later if regex search becomes
// a bottleneck at scale: NotionPageSchema.index({ title: "text", content: "text" }).
NotionPageSchema.index({ userId: 1, title: 1 });
NotionPageSchema.index({ userId: 1, pageType: 1 });
exports.NotionPage = mongoose_1.default.model("NotionPage", NotionPageSchema);
