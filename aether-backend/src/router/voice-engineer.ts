import { Router } from "express";
import { generateVoiceCommand, getVoiceHistory } from "../controller/voice-enginner";
import { verifyJWT } from "../middleware/auth";

const voiceEngineerRouter = Router();
voiceEngineerRouter.use(verifyJWT)

voiceEngineerRouter.post("/generate", generateVoiceCommand);
voiceEngineerRouter.get("/history", getVoiceHistory);

export default voiceEngineerRouter;
