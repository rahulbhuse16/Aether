import { Router } from "express";
import {
  generateDeploymentArtifacts,
  regenerateDeploymentArtifact,
  getLatestDeploymentSession,
} from "../controller/deployment";
import { verifyJWT } from "../middleware/auth";

const deployRouter = Router();
deployRouter.use(verifyJWT)

deployRouter.post("/generate", generateDeploymentArtifacts);
deployRouter.post("/regenerate", regenerateDeploymentArtifact);
deployRouter.get("/latest", getLatestDeploymentSession);

export default deployRouter;

// In your main app/router file:
// import deploymentRoutes from "./routes/deployment.routes";
// app.use("/api/deployment", deploymentRoutes);