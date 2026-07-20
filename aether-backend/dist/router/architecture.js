"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const architecture_1 = require("../controller/architecture");
const auth_1 = require("../middleware/auth");
const architectureRouter = (0, express_1.Router)();
architectureRouter.use(auth_1.verifyJWT);
architectureRouter.post("/create", architecture_1.generateArchitecture);
exports.default = architectureRouter;
