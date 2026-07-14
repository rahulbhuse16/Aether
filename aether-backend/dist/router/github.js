"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("../controller/github");
const express_1 = __importDefault(require("express"));
const gitHubRouter = express_1.default.Router();
gitHubRouter.get('/connect', github_1.connectGithubAccount);
exports.default = gitHubRouter;
