import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/User.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens =async (userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save();
        return { accessToken, refreshToken };

    }catch(error){
        throw new ApiError(500, "Failed to generate tokens", error.message);
    }    
}

const registerUser = asyncHandler(async (req, res) => {

    // get user details from frontend
    const { username, email, password, fullName } = req.body;
    console.log("Registering user:", { username, email, password });

    //Validate required fields
    if (!username || !email || !password || !fullName) {
        throw new ApiError(400, "All fields are required");
    }

    //check if user with the same email or username already exists
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existingUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // check for avatar and cover image files in the request
    const avatarFile = req.files?.avatar[0]?.path;
    // const coverImageFile = req.files?.coverImage[0] ?.path ;

    let coverImageFile ;
    if(req.files?.coverImage && req.files.coverImage.length > 0 && Array.isArray(req.files.coverImage)) {
        coverImageFile = req.files.coverImage[0].path;
    }

    if(!avatarFile) {
        throw new ApiError(400, "Avatar image is required");
    }

    //Upload avatar and cover image to cloudinary
    const avatar= await uploadOnCloudinary(avatarFile);
    const coverImage= await uploadOnCloudinary(coverImageFile);

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar image");
    }

    // Create new user
    const user = await User.create({
        fullName,
        username:username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });

    // Fetch the created user without password and refreshToken fields
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Failed to create user");
    }

    // Return the created user in the response
    return res.status(201).json(new ApiResponse(200,createdUser,"User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    const { email, username, password } = req.body;
    // username , email
    if (!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }
    //find the user
    const user= await User.findOne({
        $or: [{ email }, { username }]
    });

    if(!user){
        throw new ApiError(404, "User not found");
    }
    //pass check
    const isPasswordCorrect= await user.isPasswordCorrect(password);
    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid password");
    }
    //access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    //send cookies

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options={
        httpOnly:true,
        secure:true,
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

});

export { registerUser, loginUser, logoutUser , refreshAccessToken};