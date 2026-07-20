import { githubConnect,githubCallback,getPRByRepoId,githubWebhookController } from "../controller/github"
import express from 'express'
import { listGithubRepos, indexRepository } from "../controller/onboarding";
import { verifyJWT } from "../middleware/auth";
const gitHubRouter=express.Router()



gitHubRouter.get("/connect", githubConnect);
gitHubRouter.get("/callback", githubCallback);

gitHubRouter.get("/repos/:id",verifyJWT, listGithubRepos);
gitHubRouter.post("/index/:id",verifyJWT, indexRepository);
gitHubRouter.get("/pulls",verifyJWT, getPRByRepoId)
gitHubRouter.post(
  "/webhook",
  express.raw({
    type: "application/json",
  }),
);

gitHubRouter.use(express.json());

gitHubRouter.get("/test", (_, res) => {
  res.json({
    success: true,
    message: "GitHub router working",
  });
});

export default gitHubRouter