"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../controller/auth");
const express_1 = __importDefault(require("express"));
const authRouter = express_1.default.Router();
authRouter.post('/firebase', auth_1.firebaseLogin);
authRouter.get('/user', auth_1.getUser);
exports.default = authRouter;
