import {
  userRegister,
  userLogin,
  forgotPassword,
  resetPassword,
  verifyUser,
  verifyResetToken,
  refreshSession,
  updatePassword,
} from "../controllers/auth.controller.js";
import express from "express";

const router = express.Router();

// User verify
router.get("/verify-email", verifyUser);

// User Registration
router.post("/user-registration", userRegister);

// User login
router.post("/user-login", userLogin);

// Refresh session
router.post("/refresh-session", refreshSession);

// Forget Password
router.post("/forgot-password", forgotPassword);

// Verify reset token
router.post("/verify-reset-token", verifyResetToken);

// reset  password
router.put("/reset-password", resetPassword);

// Update Password
router.put("/update-password/:user_id", updatePassword);

export default router;
