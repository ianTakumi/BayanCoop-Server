import express from "express";
import {
  getArticles,
  getArticle,
  getCategories,
  createArticle,
  updateArticle,
  deleteArticle,
  updateArticleStatus,
} from "../controllers/article.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getArticles);
router.get("/categories", getCategories);
router.get("/:identifier", getArticle);

// Protected routes (Admin only)
router.post("/", authenticateToken, createArticle);
router.put("/:id", authenticateToken, updateArticle);
router.delete("/:id", authenticateToken, deleteArticle);
router.put("/:id/status", authenticateToken, updateArticleStatus);

export default router;
