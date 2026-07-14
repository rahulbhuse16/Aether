import dotenv from 'dotenv'
dotenv.config()

export const ENV={
    DB_URL : process.env.DB_URL || "",
    GROQ_API_KEY:process.env.GROQ_API_KEY || "",

}