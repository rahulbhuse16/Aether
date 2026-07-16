"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const voice_enginner_1 = require("../controller/voice-enginner");
const voiceEngineerRouter = (0, express_1.Router)();
voiceEngineerRouter.post("/generate", voice_enginner_1.generateVoiceCommand);
voiceEngineerRouter.get("/history", voice_enginner_1.getVoiceHistory);
exports.default = voiceEngineerRouter;
