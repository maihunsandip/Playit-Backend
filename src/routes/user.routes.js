import { Router } from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 5 }
    ]),
    registerUser
)

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyToken, logoutUser)

export default router;