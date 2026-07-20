import { getDailyDigest } from "../controller/dashboard"
import express from 'express'
import { verifyJWT } from "../middleware/auth"
const dashBoardRouter=express.Router()
dashBoardRouter.use(verifyJWT)
dashBoardRouter.post('/daily-digest',getDailyDigest)




export default dashBoardRouter