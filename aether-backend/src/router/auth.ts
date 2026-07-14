import { firebaseLogin } from '@/controller/auth'
import express from 'express'
const authRouter=express.Router()
authRouter.post('/firebase',firebaseLogin)
export default authRouter