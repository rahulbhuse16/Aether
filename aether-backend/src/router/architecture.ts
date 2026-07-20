import { Router } from "express";
import { generateArchitecture } from "../controller/architecture";
import { verifyJWT } from "../middleware/auth";

const architectureRouter = Router();
architectureRouter.use(verifyJWT)

architectureRouter.post("/create", generateArchitecture);

export default architectureRouter;

