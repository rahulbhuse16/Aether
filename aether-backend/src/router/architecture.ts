import { Router } from "express";
import { generateArchitecture } from "../controller/architecture";

const architectureRouter = Router();

architectureRouter.post("/create", generateArchitecture);

export default architectureRouter;

