import {
  userRegister,
  userLogin,
  forgotPassword,
  resetPassword,
  verifyUser,
} from "../controllers/auth.controller.js";
import express from "express";

const router = express.Router();

// User verify
router.get("/verify-email", verifyUser);

// User Registration
router.post("/user-registration", userRegister);

// User login
router.post("/user-login", userLogin);

// Forget Password
router.post("/forgot-password", forgotPassword);

// reset  password
router.post("/reset-password", resetPassword);

export default router;
