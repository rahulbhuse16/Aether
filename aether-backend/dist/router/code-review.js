"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const code_review_1 = require("../controller/code-review");
const auth_1 = require("../middleware/auth");
const codeReviewRouter = (0, express_1.Router)();
codeReviewRouter.use(auth_1.verifyJWT);
codeReviewRouter.post("/review", code_review_1.runCodeReview);
exports.default = codeReviewRouter;
