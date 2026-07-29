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
exports.notionRoutes = void 0;
const express_1 = require("express");
// ASSUMPTION: adjust this import to your actual auth middleware.
const notionController = __importStar(require("../controller/notion"));
const auth_1 = require("../middleware/auth");
exports.notionRoutes = (0, express_1.Router)();
/**
 * OAuth — connect requires auth (userId comes from the session, not a
 * query param); callback is public since Notion's redirect hits it
 * directly and the userId is recovered from the signed `state` param.
 */
exports.notionRoutes.get("/connect", notionController.connectNotion);
exports.notionRoutes.get("/callback", notionController.notionCallback);
/**
 * Webhook — public, called by Notion directly. If you mount a global
 * express.json() before this router (same issue as Slack events), carve
 * this path out for raw/text body parsing first, same fix as
 * /slack/events.
 */
exports.notionRoutes.post("/webhook", notionController.notionWebhook);
/**
 * Everything else is a protected, authenticated-user-only endpoint.
 */
exports.notionRoutes.get("/status", auth_1.verifyJWT, notionController.getNotionStatus);
exports.notionRoutes.post("/sync", auth_1.verifyJWT, notionController.syncNotion);
exports.notionRoutes.get("/pages", auth_1.verifyJWT, notionController.getNotionPages);
exports.notionRoutes.get("/search", auth_1.verifyJWT, notionController.searchNotion);
exports.notionRoutes.post("/pages", auth_1.verifyJWT, notionController.createNotionPage);
exports.notionRoutes.delete("/disconnect", auth_1.verifyJWT, notionController.disconnectNotion);
exports.notionRoutes.post("/pages/:pageId/meeting-notes/analyze", auth_1.verifyJWT, notionController.analyzeMeetingNotes);
exports.notionRoutes.post("/meeting-notes/confirm", auth_1.verifyJWT, notionController.confirmMeetingActionItems);
exports.default = exports.notionRoutes;
