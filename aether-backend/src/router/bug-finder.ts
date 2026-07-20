import { Router } from "express";
import {
  analyzeRepository,
  getReports,
  getReportById,
  deleteReport,
} from "../controller/bug-finder";
import { verifyJWT } from "../middleware/auth";

const bugRouter = Router();
bugRouter.use(verifyJWT)

bugRouter.post("/analyze", analyzeRepository);
bugRouter.get("/reports-list/:id", getReports);
bugRouter.get("/reports/:id",  getReportById);
bugRouter.delete("/reports/:id", deleteReport);

export default bugRouter;

