"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const projects_1 = require("../controller/projects");
const express_1 = __importDefault(require("express"));
const projectRouter = express_1.default.Router();
projectRouter.get('/:userId', projects_1.getUserProjects);
exports.default = projectRouter;
