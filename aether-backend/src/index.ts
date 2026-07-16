import express from 'express'
import { connectDB } from './utils/connectDB'
import cors from 'cors'
import authRouter from './router/auth'
import gitHubRouter from './router/github'
import projectRouter from './router/project'
import dashBoardRouter from './router/dashboard'
import chatRouter from './router/chat'
import codeReviewRouter from './router/code-review'
import apiAgentRouter from './router/api-agent'
import bugRouter from './router/bug-finder'
const app=express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))


app.use('/api/v1/auth',authRouter)
app.use('/api/v1/projects',projectRouter)
app.use('/api/v1/github',gitHubRouter)
app.use('/api/v1/dashboard',dashBoardRouter)
app.use('/api/v1/chat',chatRouter)
app.use('/api/v1/code-review',codeReviewRouter)
app.use('/api/v1/api-agent',apiAgentRouter)
app.use('/api/v1/bug-finder',bugRouter)



connectDB()

app.listen(5000,()=>{
    console.log("running on port 5000")
})