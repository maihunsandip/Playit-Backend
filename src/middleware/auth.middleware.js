import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import e from "express";

export const verifyToken = asyncHandler(async (req, res, next) => {
    try {
        const accessToken = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ", "");
    
        if (!accessToken) {
            throw new ApiError(401, "Unauthorized! Access token is missing.")
        }
    
        // verify token
        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        if (!decodedToken) {
            throw new ApiError(401, "Unauthorized! Invalid access token.")
        }
    
        const user = User.findById(decodedToken._id).select("-password -refreshToken -watchHistory -__v");
    
        if (!user) {
            throw new ApiError(404, "Invalid acess token! User doesn't exist.")
        }
    
        req.user = user;
        next();
    } catch (error) {
        new ApiError(401, error.message || "Unauthorized! Invalid access token.")
    }
});