"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("../controller/github");
const express_1 = __importDefault(require("express"));
const gitHubRouter = express_1.default.Router();
gitHubRouter.post('/connect', github_1.connectGithubAccount);
gitHubRouter.get("/test", (_, res) => {
    res.json({
        success: true,
        message: "GitHub router working",
    });
});
exports.default = gitHubRouter;
