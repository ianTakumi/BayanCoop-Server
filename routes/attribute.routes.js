import express from "express";
import {
  getAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  getAttributesByCategory,
} from "../controllers/attributes.controller.js";

export const router = express.Router();

// Get all attributes
router.get("/", getAttributes);

// Get attributes by category ID
router.get("/category/:categoryId", getAttributesByCategory);

// Create a new attribute
router.post("/", createAttribute);

// Update an existing attribute
router.put("/:id", updateAttribute);

// Delete an attribute
router.delete("/:id", deleteAttribute);

export default router;
