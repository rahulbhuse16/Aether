import { githubConnect,githubCallback } from "../controller/github"
import express from 'express'
const gitHubRouter=express.Router()

gitHubRouter.get("/connect", githubConnect);
gitHubRouter.get("/callback", githubCallback);


gitHubRouter.get("/test", (_, res) => {
  res.json({
    success: true,
    message: "GitHub router working",
  });
});

export default gitHubRouter