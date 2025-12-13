import express from "express";
import {
  createCommunity,
  getCommunities,
  updateCommunityStatus,
} from "../controllers/community.controller.js";

const router = express.Router();

// Get all communities for user
router.get("/", getCommunities);

// Create community
router.post("/:user_id", createCommunity);

// Update community status by admin
router.put("/update-status/:community_id", updateCommunityStatus);

export default router;
