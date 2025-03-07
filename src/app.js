import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
console.log("🚀 app.js is starting...");



const app=express()



app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))


app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())



// routes import

import userRouter from './routes/user.routes.js'

console.log('User routes loaded:', userRouter);

//routes declaration
app.use("/api/v1/users",userRouter)

//https://localhost:8000/api/v1/users/register





export { app }