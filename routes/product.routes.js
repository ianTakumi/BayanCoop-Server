import express from "express";
import {
  getAllProductsBasedOnCoopId,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct,
  getProductAttributes,
  createAttribute,
  updateAttribute,
  updateAttributeStock,
  bulkUpdateStock,
  unarchiveProduct,
  getAllProducts,
} from "../controllers/products.controller.js";

const router = express.Router();

// ============ PRODUCTS ROUTES ============

// Get all products for user
router.get("/", getAllProducts);

// Get all products for a cooperative (coop_id = cooperatives.id)
router.get("/:coopId", getAllProductsBasedOnCoopId);

// Get single product by product ID
router.get("/single/:id", getProductById);

// Create new product for a cooperative
router.post("/:coopId", createProduct);

// Update product by product ID
router.put("/:id", updateProduct);

// Archive product
router.put("/archive/:id", archiveProduct);

// Unarchive product
router.put("/unarchive/:id", unarchiveProduct);

// ============ PRODUCT ATTRIBUTES ROUTES ============

// Get all attributes for a product
router.get("/:productId/attributes", getProductAttributes);

// Create new attribute for a product
router.post("/:productId/attributes", createAttribute);

// Update product attribute
router.put("/attributes/:attributeId", updateAttribute);

// Update product attribute stock
router.patch("/attributes/:attributeId/stock", updateAttributeStock);

// ============ BULK OPERATIONS ============

// Bulk update stock for a cooperative
router.post("/cooperative/:coopId/inventory/bulk-update", bulkUpdateStock);

export default router;
