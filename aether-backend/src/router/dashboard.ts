import { getDailyDigest } from "../controller/dashboard"
import express from 'express'
const dashBoardRouter=express.Router()
dashBoardRouter.post('/daily-digest',getDailyDigest)




export default dashBoardRouter