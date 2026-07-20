import { Router } from "express";
import { sendRepoChatMessage } from "../controller/chat";
import { verifyJWT } from "../middleware/auth";

const chatRouter = Router();
chatRouter.use(verifyJWT)
chatRouter.post("/message",sendRepoChatMessage)
export default chatRouter;


