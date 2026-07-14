import { connectGithubAccount} from "../controller/github"
import express from 'express'
const gitHubRouter=express.Router()
gitHubRouter.post('/connect',connectGithubAccount)


gitHubRouter.get("/test", (_, res) => {
  res.json({
    success: true,
    message: "GitHub router working",
  });
});

export default gitHubRouter