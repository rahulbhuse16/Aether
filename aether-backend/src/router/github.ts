import { githubConnect,githubCallback,getPRByRepoId } from "../controller/github"
import express from 'express'
import { listGithubRepos, indexRepository } from "../controller/onboarding";
const gitHubRouter=express.Router()

gitHubRouter.get("/connect", githubConnect);
gitHubRouter.get("/callback", githubCallback);

gitHubRouter.get("/repos/:id", listGithubRepos);
gitHubRouter.post("/index/:id", indexRepository);
gitHubRouter.get("/pulls",getPRByRepoId)


gitHubRouter.get("/test", (_, res) => {
  res.json({
    success: true,
    message: "GitHub router working",
  });
});

export default gitHubRouter