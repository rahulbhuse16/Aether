import { Router } from "express";
import {
  generateDocs,
  regenerateDoc,
  getLatestDocsSession
} from "../controller/documentation";

const docsRouter = Router();

docsRouter.post("/generate", generateDocs);
docsRouter.post("/regenerate", regenerateDoc);
docsRouter.get("/latest", getLatestDocsSession);

export default docsRouter;