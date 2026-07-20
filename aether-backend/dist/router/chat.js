"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_1 = require("../controller/chat");
const auth_1 = require("../middleware/auth");
const chatRouter = (0, express_1.Router)();
chatRouter.use(auth_1.verifyJWT);
chatRouter.post("/message", chat_1.sendRepoChatMessage);
exports.default = chatRouter;
