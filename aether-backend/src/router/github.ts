import { connectGithubAccount} from "../controller/github"
import express from 'express'
const gitHubRouter=express.Router()
gitHubRouter.post('/connect',connectGithubAccount)

export default gitHubRouter