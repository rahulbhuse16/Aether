import { Router } from "express";
import {
  analyzeRepository,
  getReports,
  getReportById,
  deleteReport,
} from "../controller/bug-finder";

const bugRouter = Router();

bugRouter.post("/analyze", analyzeRepository);
bugRouter.get("/reports-list/:id", getReports);
bugRouter.get("/reports/:id",  getReportById);
bugRouter.delete("/reports/:id", deleteReport);

export default bugRouter;

