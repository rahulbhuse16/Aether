"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("../controller/github");
const express_1 = __importDefault(require("express"));
const onboarding_1 = require("../controller/onboarding");
const auth_1 = require("../middleware/auth");
const gitHubRouter = express_1.default.Router();
gitHubRouter.get("/connect", github_1.githubConnect);
gitHubRouter.get("/callback", github_1.githubCallback);
gitHubRouter.get("/repos/:id", auth_1.verifyJWT, onboarding_1.listGithubRepos);
gitHubRouter.post("/index/:id", auth_1.verifyJWT, onboarding_1.indexRepository);
gitHubRouter.get("/pulls", auth_1.verifyJWT, github_1.getPRByRepoId);
gitHubRouter.post("/webhook", github_1.githubWebhookController);
gitHubRouter.get("/test", (_, res) => {
    res.json({
        success: true,
        message: "GitHub router working",
    });
});
exports.default = gitHubRouter;
