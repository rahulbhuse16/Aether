import { Router } from "express";
import { runCodeReview } from "../controller/code-review";

const codeReviewRouter = Router();
codeReviewRouter.post("/review", runCodeReview);

export default codeReviewRouter;
