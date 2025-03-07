import mongoose from 'mongoose'
import {DB_NAME} from "./constants.js"
//require('dotenv').config({path:'./env'})


import dotenv from "dotenv"

dotenv.config(
    {
        path:'./.env'
    }
)

import connectDB from './db/index.js'



import express from 'express'

const app=express()

// ;( async ()=>{
//     try{
//         await  mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERRR: ",error);
//             throw error
//         })

//         app.listen(process.env.PORT ,()=>{
//             console.log(`App is listening on port ${process.env.PORT}`);
//         })

//     }
//     catch(error){
//         console.log("ERROR: ",error)
//         throw err
//     }
// })()



connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running at port:${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGODB connection failed !!! ",err);
})

// console.log("🛠️ Available Routes:");
// if (app._router) {
//     app._router.stack.forEach((r) => {
//         if (r.route && r.route.path) {
//             console.log(r.route.path);
//         }
//     });
// } else {
//     console.log("⚠️ No routes found! Check if routes are imported correctly.");
// }
