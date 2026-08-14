import express from "express";
import { forgotPassword, register, resetPassword, updatePassword, updateProfile } from "../controllers/authController.js";
import { login } from "../controllers/authController.js";
import { getUser } from "../controllers/authController.js";
import { logout } from "../controllers/authController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register",register);
router.post("/login",login);
router.get("/me",isAuthenticated,getUser);
router.get("/logout",isAuthenticated,logout);
router.post("/password/forget",forgotPassword);
router.put("/password/reset/:token",resetPassword);
router.put("/password/update",isAuthenticated,updatePassword);
router.put("/profile/update",isAuthenticated,updateProfile);
export default router;