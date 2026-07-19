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
exports.MeetingModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const JiraTicketSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    key: { type: String },
    summary: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    url: { type: String },
}, { _id: false });
const MeetingSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    date: { type: String, required: true },
    durationSeconds: { type: Number, default: 0 },
    duration: { type: String, required: true },
    status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
    summary: { type: String, default: "" },
    actionItems: { type: [String], default: [] },
    transcript: { type: String, default: "" },
    audioFileName: { type: String },
    failureReason: { type: String },
    ticketsCreated: { type: Boolean, default: false },
    tickets: { type: [JiraTicketSchema], default: [] },
    emailSent: { type: Boolean, default: false },
    emailSummary: { type: String },
}, { timestamps: true });
exports.MeetingModel = mongoose_1.default.models.Meeting || (0, mongoose_1.model)("Meeting", MeetingSchema, "meetings");
