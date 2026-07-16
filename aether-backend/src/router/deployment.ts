import { Router } from "express";
import {
  generateDeploymentArtifacts,
  regenerateDeploymentArtifact,
  getLatestDeploymentSession,
} from "../controller/deployment";

const deployRouter = Router();

deployRouter.post("/generate", generateDeploymentArtifacts);
deployRouter.post("/regenerate", regenerateDeploymentArtifact);
deployRouter.get("/latest", getLatestDeploymentSession);

export default deployRouter;

// In your main app/router file:
// import deploymentRoutes from "./routes/deployment.routes";
// app.use("/api/deployment", deploymentRoutes);