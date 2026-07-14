import { ENV } from "../config/env"
import mongoose from 'mongoose'


export const connectDB=async()=>{

    try{

        await mongoose.connect(ENV.DB_URL)
        console.log("connected to db")


    }
    catch(err){
        console.log("conn err",err)
    

    }

}