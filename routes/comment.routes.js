import express from "express";
import {
  getCommentsByPostId,
  createComment,
  updateComment,
  deleteComment,
  toggleCommentVote,
} from "../controllers/comment.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);
router.get("/post/:post_id", getCommentsByPostId);

router.post("/post/:post_id", createComment);
router.put("/:comment_id", updateComment);
router.delete("/:comment_id", deleteComment);
router.put("/:comment_id/vote", toggleCommentVote);

export default router;
