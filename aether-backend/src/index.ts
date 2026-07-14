import express from 'express'
import { connectDB } from './utils/connectDB'
import cors from 'cors'
import authRouter from './router/auth'
import gitHubRouter from './router/github'
import projectRouter from './router/project'
import dashBoardRouter from './router/dashboard'
const app=express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))


app.use('/api/v1/auth',authRouter)
app.use('/api/v1/projects',projectRouter)
app.use('/api/v1/github',gitHubRouter)
app.use('/api/v1/dashboard',dashBoardRouter)


connectDB()

app.listen(5000,()=>{
    console.log("running on port 5000")
})