"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const architecture_1 = require("../controller/architecture");
const architectureRouter = (0, express_1.Router)();
architectureRouter.post("/create", architecture_1.generateArchitecture);
exports.default = architectureRouter;
