import { Router } from "express";
import { generateVoiceCommand, getVoiceHistory } from "../controller/voice-enginner";

const voiceEngineerRouter = Router();

voiceEngineerRouter.post("/generate", generateVoiceCommand);
voiceEngineerRouter.get("/history", getVoiceHistory);

export default voiceEngineerRouter;
