import { Router } from "express";
import { sendRepoChatMessage } from "../controller/chat";

const chatRouter = Router();
chatRouter.post("/message",sendRepoChatMessage)
export default chatRouter;


