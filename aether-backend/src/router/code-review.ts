import { Router } from "express";
import { runCodeReview } from "../controller/code-review";
import { verifyJWT } from "../middleware/auth";

const codeReviewRouter = Router();
codeReviewRouter.use(verifyJWT)
codeReviewRouter.post("/review", runCodeReview);

export default codeReviewRouter;
