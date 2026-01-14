import express from "express";
import {
  getAllCategoriesForAdmin,
  getCategoriesForDropdown,
  getCategoryById,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
} from "../controllers/categories.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET Routes
router.get("/", getAllCategoriesForAdmin);
router.get("/dropdown", getCategoriesForDropdown);
router.get("/:category_id", getCategoryById);

// POST Routes
router.post("/", authenticateToken, createCategory);

// PUT Routes
router.put("/:category_id", authenticateToken, updateCategory);
router.put("/:category_id/archive", authenticateToken, archiveCategory);
router.put("/:category_id/restore", authenticateToken, restoreCategory);

export default router;
