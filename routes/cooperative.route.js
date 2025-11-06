import express from "express";
import {
  createCooperative,
  getCooperatives,
  getTotalCount,
  updateCooperative,
} from "../controllers/cooperative.controller.js";

const router = express.Router();

// Get total count of cooperatives
router.get("/get-total-count", getTotalCount);

// Get all cooperatives for admin
router.get("/", getCooperatives);

// Register cooperative
router.post("/", createCooperative);

// Update profile
router.put("/:coopId", updateCooperative);

export default router;
