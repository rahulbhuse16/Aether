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
exports.Task = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TaskSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    status: { type: String, enum: ["open", "in_progress", "done"], default: "open" },
    source: { type: String, enum: ["github", "jira", "ai"], required: true },
    priority: { type: String, enum: ["high", "medium", "low"] },
    dueDate: { type: String },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    githubIssueNumber: { type: Number },
    githubIssueUrl: { type: String },
    githubIssueId: { type: String },
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: "Project", required: true }
}, { timestamps: true });
// Serialize exactly the fields the frontend Task type expects
TaskSchema.methods.toJSON = function () {
    const { id, title, status, source, priority, dueDate, githubIssueNumber, githubIssueUrl } = this;
    return { id, title, status, source, priority, dueDate, githubIssueNumber, githubIssueUrl };
};
exports.Task = mongoose_1.default.model("Task", TaskSchema);
