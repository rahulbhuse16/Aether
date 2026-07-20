import { getUserProjects } from "../controller/projects"
import express from 'express'
import { verifyJWT } from "../middleware/auth"
const projectRouter=express.Router()
projectRouter.use(verifyJWT)
projectRouter.get('/:userId',getUserProjects)

export default projectRouter