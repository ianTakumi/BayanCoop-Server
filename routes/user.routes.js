import {
  getTotalUsers,
  getAllUsers,
  getActiveUsers,
  getInactiveUsers,
  updateUserProfile,
} from "../controllers/user.controller.js";
import express from "express";

const router = express.Router();

// Get total # of users
router.get("/total-num-users", getTotalUsers);

// Get all users
router.get("/", getAllUsers);

// Get total # of  active users
router.get("/total-active-users", getActiveUsers);

// Get total # of inactive users
router.get("/total-inactive-users", getInactiveUsers);

// Update user profile
router.put("/profile-update/:userId", updateUserProfile);

export default router;
