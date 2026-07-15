"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_1 = require("../controller/chat");
const chatRouter = (0, express_1.Router)();
chatRouter.post("/message", chat_1.sendRepoChatMessage);
exports.default = chatRouter;
