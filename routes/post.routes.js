import express from "express";
import {
  getPostsByCommunity,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getUserPosts,
  togglePinPost,
  toggleVote,
} from "../controllers/post.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/community/:community_id", getPostsByCommunity);
router.get("/:id", getPostById);
router.get("/user/:user_id", getUserPosts);

// Protected routes (require authentication)
router.use(authenticateToken);
router.post("/", createPost);
router.put("/:id", updatePost);
router.put("/:id/vote", toggleVote);
router.delete("/:id", deletePost);
router.patch("/:id/pin", togglePinPost);

export default router;
