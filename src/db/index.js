import mongoose from 'mongoose'
import {DB_NAME} from "../constants.js"



const connectDB=async()=>{
    try{
      console.log("🛠️ MONGODB_URI:", process.env.MONGODB_URI);
      console.log("🛠️ DB_NAME:", process.env.DB_NAME);


       const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
       console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`)

    }
    catch(error){
       console.log("MONGODB connection Failed: ",error);
       process.exit(1)
    }
}


export default connectDB