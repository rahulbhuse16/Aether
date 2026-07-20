import { Router } from "express";
import {
  generateDocs,
  regenerateDoc,
  getLatestDocsSession
} from "../controller/documentation";
import { verifyJWT } from "../middleware/auth";

const docsRouter = Router();
docsRouter.use(verifyJWT)

docsRouter.post("/generate", generateDocs);
docsRouter.post("/regenerate", regenerateDoc);
docsRouter.get("/latest", getLatestDocsSession);

export default docsRouter;