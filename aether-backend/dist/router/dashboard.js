"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dashboard_1 = require("../controller/dashboard");
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const dashBoardRouter = express_1.default.Router();
dashBoardRouter.use(auth_1.verifyJWT);
dashBoardRouter.post('/daily-digest', dashboard_1.getDailyDigest);
exports.default = dashBoardRouter;
