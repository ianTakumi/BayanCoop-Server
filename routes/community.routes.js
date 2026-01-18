import express from "express";
import {
  getUserJoinedCommunities,
  getCommunities,
  getCommunityBasedOnOwnerID,
  getCommunityBasedOnSlug,
  createCommunity,
  updateCommunity,
  updateCommunityStatus,
} from "../controllers/community.controller.js";

const router = express.Router();

// Get all communities for user
router.get("/", getCommunities);

// Get community based on slug
router.get("/slug/:slug", getCommunityBasedOnSlug);

// Get communities that user has joined
router.get("/joined/:user_id", getUserJoinedCommunities);

// Get community based on owner ID
router.get("/owner/:user_id", getCommunityBasedOnOwnerID);

// Create community
router.post("/:user_id", createCommunity);

router.put("/:community_id", updateCommunity);

// Update community status by admin
router.put("/update-status/:community_id", updateCommunityStatus);

export default router;
