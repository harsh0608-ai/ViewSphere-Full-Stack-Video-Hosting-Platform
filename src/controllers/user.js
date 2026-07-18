import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/User.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";

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
    const avtarFile = req.files?.avatar[0]?.path;
    const coverImageFile = req.files?.coverImage ?.path ;

    if(!avtarFile) {
        throw new ApiError(400, "Avatar image is required");
    }

    //Upload avatar and cover image to cloudinary
    const avtar= await uploadOnCloudinary(avtarFile);
    const coverImage= await uploadOnCloudinary(coverImageFile);

    if (!avtar) {
        throw new ApiError(500, "Failed to upload avatar image");
    }

    // Create new user
    const user = await User.create({
        fullName,
        username:username.toLowerCase(),
        email,
        password,
        avatar: avtar.secure_url,
        coverImage: coverImage?.secure_url || ""
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

export { registerUser };G