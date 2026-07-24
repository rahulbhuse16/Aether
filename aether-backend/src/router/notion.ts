import { Router } from "express";
// ASSUMPTION: adjust this import to your actual auth middleware.
import * as notionController from "../controller/notion";
import { verifyJWT } from "../middleware/auth";

export const notionRoutes = Router();

/**
 * OAuth — connect requires auth (userId comes from the session, not a
 * query param); callback is public since Notion's redirect hits it
 * directly and the userId is recovered from the signed `state` param.
 */
notionRoutes.get("/connect", notionController.connectNotion);
notionRoutes.get("/callback", notionController.notionCallback);

/**
 * Webhook — public, called by Notion directly. If you mount a global
 * express.json() before this router (same issue as Slack events), carve
 * this path out for raw/text body parsing first, same fix as
 * /slack/events.
 */
notionRoutes.post("/webhook", notionController.notionWebhook);

/**
 * Everything else is a protected, authenticated-user-only endpoint.
 */
notionRoutes.get("/status", verifyJWT, notionController.getNotionStatus);
notionRoutes.post("/sync", verifyJWT, notionController.syncNotion);
notionRoutes.get("/pages", verifyJWT, notionController.getNotionPages);
notionRoutes.get("/search", verifyJWT, notionController.searchNotion);
notionRoutes.post("/pages", verifyJWT, notionController.createNotionPage);
notionRoutes.delete("/disconnect", verifyJWT, notionController.disconnectNotion);

export default notionRoutes;