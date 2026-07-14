import { getUserProjects } from '@/controller/projects'
import express from 'express'
const projectRouter=express.Router()
projectRouter.get('/:userId',getUserProjects)

export default projectRouter