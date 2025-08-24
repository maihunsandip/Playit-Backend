import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser }