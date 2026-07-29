import { Router } from "express";
import { verifyJWT } from "../middleware/auth";
import {
  analyzeIncident,
  createIncident,
  getIncident,
  getIncidentsByProject,
  patchIncident,
} from "../controller/incident-commander";

const incidentRouter = Router();

incidentRouter.use(verifyJWT);

incidentRouter.post("/", createIncident);
incidentRouter.get("/project/:projectId", getIncidentsByProject);
incidentRouter.get("/:incidentId", getIncident);
incidentRouter.patch("/:incidentId", patchIncident);
incidentRouter.post("/:incidentId/analyze", analyzeIncident);

export default incidentRouter;
