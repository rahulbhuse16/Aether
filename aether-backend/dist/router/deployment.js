"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deployment_1 = require("../controller/deployment");
const auth_1 = require("../middleware/auth");
const deployRouter = (0, express_1.Router)();
deployRouter.use(auth_1.verifyJWT);
deployRouter.post("/generate", deployment_1.generateDeploymentArtifacts);
deployRouter.post("/regenerate", deployment_1.regenerateDeploymentArtifact);
deployRouter.get("/latest", deployment_1.getLatestDeploymentSession);
exports.default = deployRouter;
// In your main app/router file:
// import deploymentRoutes from "./routes/deployment.routes";
// app.use("/api/deployment", deploymentRoutes);
