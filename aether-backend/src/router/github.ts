import { connectGithubAccount} from '@/controller/github'
import express from 'express'
const gitHubRouter=express.Router()
gitHubRouter.get('/connect',connectGithubAccount)

export default gitHubRouter