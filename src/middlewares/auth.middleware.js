import { ApiError } from "../utils/apiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"





const verifyJWT=asyncHandler(async(req , _, next)=>{
   try {
    const token= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
 
   if(!token){
     throw new ApiError(401," Unauthourized request")
   }
 
   const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
 
   const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

 
   
   if(!user){
     //TODO: discuss about frontend
     throw new ApiError(401," Invalid Access Token")
   }
 
 
   req.user=user;
   next()


   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
    
   }
  


})


export default verifyJWT;