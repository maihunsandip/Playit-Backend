import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        // generate an access token & fresh token
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // return { accessToken, refreshToken }
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Failed to generate access token and refresh token" + error.message)
    }
}

const registerUser = asyncHandler(async (req, res) => {

    // get user data from request body
    const { username, fullName, email, password } = req.body;

    console.log("Registering user:", username, email);

    // validate user data (not empty, valid email, etc.)
    if (!username || !fullName || !email || !password) {
        throw new ApiError(400, "All fields are required");
    }

    // check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // check for images, avtar and cover image
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    // upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar image");
    }

    // create user object - create user entry in database
    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.secure_url,
        coverImage: coverImage?.url || "",
    });

    // remove password and refresh token from response
    const registeredUser = await User.findById(user._id).select("-password -refreshToken -watchHistory -__v");

    // check if user is created successfully
    if (!registeredUser) {
        throw new ApiError(500, "Failed to register user");
    }

    // return success response with user data
    return res.status(201).json(
        new ApiResponse(
            201,
            registeredUser,
            "User registered successfully"
        )
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // get user data from req.body
    console.log("BODY RECEIVED:", req.body);

    const { username, email, password } = req.body;

    // validate given data as required
    if (!username && !email) {
        throw new ApiError(400, "username or email is required!")
    }
    if (!password) {
        throw new ApiError(400, "Password is required!")
    }


    // find a user in database with given email/username
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!existedUser) {
        throw new ApiError(404, "user doesn't exist! please register!")
    }

    // validate password
    const isPasswordCorrect = await existedUser.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid password! Please try again.")
    }

    // generate an access token & fresh token
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(existedUser._id);


    // update user 
    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken -watchHistory -__v");


    // return success response with user data & token
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(
            200,
            { user: loggedInUser, accessToken, refreshToken },
            "User logged in successfully"
        )
    )
});

const logoutUser = asyncHandler(async (req, res) => {
    // find user in database and remove refresh token
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: null
            }
        },
        {
            new: true
        });

    // return success response and clear cookies
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                null,
                "User logged out successfully"
            )
        )
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized access!");
    }

    try {
        // decoce and verify refresh token
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    
        // find user with the refresh token
        const user = await User.findById(decodedToken._id).select(-password);
        if (!user) {
            throw new ApiError(404, "Invalid refresh token - user not found");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token expired or used!");
        }
    
        // generate new access token and refresh token
        const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id);
    
        // return response with new tokens
        const options = {
            httpOnly: true,
            secure: true,
        }
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "Access token refreshed successfully"
            )
        ) 
    } catch (error) {
        throw new ApiError(401, error.message || "Invalid or expired refresh token");
    }

});

export { registerUser, loginUser, logoutUser, refreshAccessToken };