import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";



const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Generate tokens
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Store refresh token in the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};



const registerUser=asyncHandler(async (req,res)=>{
    // get user details from frontend
    //validation - not empty
    //check if user already interest : username,emial
    //check for images,check for avatar
    //upload them to cloudinary
    //create user object - create entry in db
    //remove  passwd and refresh token field from response
    //check for user creation
    //retrun response

    const {fullname , email,username,password}=req.body

    console.log("email :",email);

    if( 
        [ fullname , email , username, password].some((field)=> field?.trim()==="")
    ){
        throw new ApiError (400, "fullname is required")
    }
    
    const existedUser=await User.findOne({
        $or: [{username},{email}]
     })

     if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
     }
     console.log(req.files);

     const avatarLocalPath=req.files?.avatar?.[0]?.path;
//     const coverImageLocalPath=req.files?.coverImage?.[0]?.path;
let coverImageLocalPath;
 if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage > 0) {
    coverImageLocalPath=req.files.coverImage[0].path
 }


     if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath)
     const coverImage = await uploadOnCloudinary(coverImageLocalPath)
     

     if(!avatar){
        throw new ApiError(400,"Avatar file is required")

     }

    const  user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username?.toLowerCase() 
     })


    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )


    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")

    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Succesfully")
    )








} )

const loginUser = asyncHandler (async (req,res)=>{
    // req body ->data
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookies
    // console.log("Request body:", req.body);
    const {email , username, password}=req.body
 //   console.log("Email from request",email);
 //   console.log("Username received:", username);
    const userpassword = String(password);
   


    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    });

    if(!user){
        throw new ApiError(404 ,"User does not exist")

    }

    const isPasswordValid= await user.isPasswordCorrect(userpassword)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")


    const options={
        httpOnly: true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },

            "User logged in Successfully"
        )
    )




})



const logoutUser = asyncHandler(async (req,res)=>{
    //cookie remove

  await User.findByIdAndUpdate(
    req.user._id,
    {
        $unset:{
            refreshToken:1   //this removes the field from document
        }        
    },
    {
        new:true
    }
   )

   const options={
    httpOnly:true,
    secure:true
   }
   return res.status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken = asyncHandler (async (req,res)=>{
  const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshtoken

 if(!incomingRefreshToken){
    throw new ApiError(401, "unauthorized request")
 }

 try {
    const decodedToken=jwt.verify(
       incomingRefreshToken,
       process.env.REFRESH_TOKEN_SECRET
   
    )
   
    const user=User.findById(decodedToken?._id)
   
   
    if(!user){
       throw new ApiError(401, "Invalid refresh token")
    }
   
   
    if(incomingRefreshToken !== user?.refreshToken){
       throw new ApiError(401, "Refresh token is expired or used")
    }
   
    const option={
       httpOnly:true,
       secure:true
    }
   
    const {accessToken, newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
   
    return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", newRefreshToken)
    .json(
       new ApiResponse(200,
           {accessToken,refreshToken: newRefreshToken},
           "Access token refreshed"
   
       )
    )
 } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
    
 }






})



const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword }= req.body

 //   if(!(newPassword===confpassword))

   const user =await User.findById( req.user?._id)
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
    throw new ApiError(400,"Invalid old password")
   }


    user.password=newPassword
    await user.save({validateBeforeSave: false})
   
   return res.status(200).json(new ApiResponse(200,{},"Password Changed Successfully"  ))

})



const getCurrentUser= asyncHandler(async(req,res)=>{
    return res.status(200).json(200, req.user, "current user fetched succesfully")
})


const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body
    if(!fullname || !email){
        throw new ApiError(400,"All Fields are required")

    }

   const user=User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            fullname,
            email:email
        }
    },
    {new:true}
   ).select("-password")


   return res.status(200)
   .json(new ApiResponse(200,user,"Account details updated Successfully"))

   
})

const updateUserAvatar= asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")

    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar")

    }


    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new: true}
    ).select("-password")

    
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated succesfully")
    )



})
const updateUserCoverImage= asyncHandler(async(req,res)=>{
    const CoverImageLocalPath=req.file?.path
    if(!CoverImageLocalPath){
        throw new ApiError(400, "CoverImage file is missing")

    }

    const coverImage=await uploadOnCloudinary(CoverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on avatar")

    }


   const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new: true}
    ).select("-password")


    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated succesfully")
    )


})


const getUserChannelProfile= asyncHandler(async(req,res)=>{
   const {username}= req.params

   if(!username?.trim()){
      throw new ApiError(400,"username is missing")
   }

   const channel=await User.aggregate([
    {
        $match:{
            username: username?.toLowerCase()
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"

        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribeTo"

        }
    },
    {
        $addFields:{
            subScriberCount:{
                $size: "$subscribers"
            },
            channelsubScribedToCount:{
                $size: "$subscribeTo"
            },
             isSubscribed :{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false,
                }

             }
             
            
        }
    },
    {
        $project:{
            fullname:1,
            username:1,
            subScriberCount:1,
            channelsubScribedToCount:1,
            isSubscribed:1,
            avatar:1,
            email:1,
            coverImage:1,


        }
    }
   ])

   if(!channel?.length){
  throw new ApiError(404, " channel does not exists")
   }


   return res.status(200).json(
    new ApiResponse(200, channel[0],"User channel fetched successfully")
   )
   

})


const getWatchHistory= asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:" watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                $project:{
                                    fullname:1,
                                    username:1,
                                    avatar:1

                                }

                            },{
                                $addFields:{
                                    owner:{
                                        $first:"$owner"
                                    }
                                }
                            }
                               
                            ]
                        }
                    },
                ]
            }
        }
    ])
    return res.status(200).json(
      new ApiResponse(200,
        user[0].watchHistory,
        "Watch history fetched succesfully"
      )
    )
})




export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}