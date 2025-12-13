import express from "express";
import {
  updateCoopStatus,
  createCooperative,
  getCoopBasedOnOwner,
  getCooperatives,
  getSingleCoop,
  getTotalCount,
  updateCooperative,
} from "../controllers/cooperative.controller.js";
import { authenticateToken } from "../middleware/auth.js";
const router = express.Router();

// Get total count of cooperatives
router.get("/get-total-count", getTotalCount);

// Get single coop
router.get("/get-coop/:coopId", getSingleCoop);

// Get single coop based on userID(Owner)
router.get("/get-coop-based-owner/:userId/", getCoopBasedOnOwner);

// Get all cooperatives for admin
router.get("/", authenticateToken, getCooperatives);

// Register cooperative
router.post("/", createCooperative);

// Approve Coop
router.put("/update-coop-status/:coopId", updateCoopStatus);

// Update profile
router.put("/:coopId", updateCooperative);

export default router;
