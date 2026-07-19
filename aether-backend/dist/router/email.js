"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const email_1 = require("../controller/email");
const emailRouter = express_1.default.Router();
emailRouter.post("/send", email_1.sendTestEmail);
exports.default = emailRouter;
