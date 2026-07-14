import { firebaseLogin, getUser } from "../controller/auth"
import express from 'express'
const authRouter=express.Router()
authRouter.post('/firebase',firebaseLogin)
authRouter.get('/user',getUser)

export default authRouter