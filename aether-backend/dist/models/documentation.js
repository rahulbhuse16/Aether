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
exports.DocsSession = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const GeneratedDocSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true, enum: ["readme", "api", "architecture", "flow"] },
    status: { type: String, required: true, enum: ["ready", "error"], default: "ready" },
    preview: { type: String, required: true },
    content: { type: String, required: true },
}, { _id: false });
const DocsSessionSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    repoId: { type: String, required: true },
    owner: { type: String, required: true },
    repoName: { type: String, required: true },
    branch: { type: String, required: true },
    documents: { type: [GeneratedDocSchema], default: [] },
    model: { type: String, default: "" },
    status: { type: String, enum: ["completed", "failed"], default: "completed" },
    errorMessage: { type: String, default: "" },
}, { timestamps: true });
// One live doc set per user+repo — regenerating replaces it rather than growing a history list.
DocsSessionSchema.index({ user: 1, repoId: 1 }, { unique: true });
exports.DocsSession = mongoose_1.default.models.DocsSession || mongoose_1.default.model("DocsSession", DocsSessionSchema);
