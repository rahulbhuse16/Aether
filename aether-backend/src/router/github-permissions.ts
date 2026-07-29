import { Router } from "express";
import {
  getGitHubPermissions,
  updateGitHubPermissions,
  syncRepositories,
} from "../controller/github-permissions";
import { verifyJWT } from "../middleware/auth";

const githubPermissionsRouter = Router();

githubPermissionsRouter.get("/:userId", verifyJWT, getGitHubPermissions);
githubPermissionsRouter.patch("/:userId", verifyJWT, updateGitHubPermissions);
githubPermissionsRouter.post("/:userId/sync", verifyJWT, syncRepositories);

export default githubPermissionsRouter;
