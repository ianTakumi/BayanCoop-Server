import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateInventory,
  archiveProduct,
  restoreProduct,
  getPriceHistory,
  getLowStockProducts,
} from "../controllers/product.controller.js";

const router = express.Router();

// All routes are prefixed with: /api/cooperatives/:coopId/products

// Get all products for a coop
router.get("/:coopId/products", getAllProducts);

// Get single product
router.get("/:coopId/products/:productId", getProductById);

// Create new product
router.post("/:coopId/products", createProduct);

// Update product
router.put("/:coopId/products/:productId", updateProduct);

// Update product inventory
router.patch("/:coopId/products/:productId/inventory", updateInventory);

// Archive product (soft delete)
router.delete("/:coopId/products/:productId/archive", archiveProduct);

// Restore archived product
router.patch("/:coopId/products/:productId/restore", restoreProduct);

// Get product price history
router.get("/:coopId/products/:productId/price-history", getPriceHistory);

// Get low stock products
router.get("/:coopId/products/low-stock", getLowStockProducts);

export default router;
