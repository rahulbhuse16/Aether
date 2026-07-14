import { firebaseLogin, getUser } from "../controller/auth"
import express from 'express'
const authRouter=express.Router()
authRouter.post('/firebase',firebaseLogin)
authRouter.post('/user',getUser)

export default authRouter