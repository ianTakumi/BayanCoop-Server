import express from "express";
import supplierProductsController from "../controllers/supplierProducts.controller.js";
import { body, param, query } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";
// import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Validation middleware
const validateProduct = [
  body("name").notEmpty().withMessage("Product name is required"),
  body("category").notEmpty().withMessage("Category is required"),
  body("unit_type").notEmpty().withMessage("Unit type is required"),
  body("base_price")
    .isFloat({ min: 0 })
    .withMessage("Base price must be a positive number"),
];

const validatePrice = [
  body("unit_price")
    .isFloat({ min: 0 })
    .withMessage("Unit price must be a positive number"),
  body("price_type")
    .isIn(["default", "bulk", "promo", "seasonal", "contract"])
    .withMessage("Invalid price type"),
  body("min_quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Minimum quantity must be at least 1"),
  body("discount_percentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount percentage must be between 0 and 100"),
];

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/supplier-products/supplier/:supplierId
 * @desc    Get all products for a supplier
 * @access  Private (Supplier)
 */
router.get(
  "/supplier/:supplierId",
  [
    param("supplierId").isUUID().withMessage("Invalid supplier ID"),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  supplierProductsController.getSupplierProducts
);

/**
 * @route   GET /api/supplier-products/stats/:supplierId
 * @desc    Get product statistics for dashboard
 * @access  Private (Supplier)
 */
router.get(
  "/stats/:supplierId",
  param("supplierId").isUUID().withMessage("Invalid supplier ID"),
  supplierProductsController.getProductStats
);

/**
 * @route   GET /api/supplier-products/:id
 * @desc    Get a single product by ID
 * @access  Private (Supplier, Coop Admin)
 */
router.get(
  "/:id",
  param("id").isUUID().withMessage("Invalid product ID"),
  supplierProductsController.getProductById
);

/**
 * @route   POST /api/supplier-products
 * @desc    Create a new supplier product
 * @access  Private (Supplier)
 */
router.post(
  "/",
  // roleMiddleware(["supplier"]),
  validateProduct,
  supplierProductsController.createProduct
);

/**
 * @route   PUT /api/supplier-products/:id
 * @desc    Update a supplier product
 * @access  Private (Supplier)
 */
router.put(
  "/:id",
  // roleMiddleware(["supplier"]),
  param("id").isUUID().withMessage("Invalid product ID"),
  supplierProductsController.updateProduct
);

/**
 * @route   DELETE /api/supplier-products/:id
 * @desc    Archive a supplier product
 * @access  Private (Supplier)
 */
router.delete(
  "/:id",
  // roleMiddleware(["supplier"]),
  param("id").isUUID().withMessage("Invalid product ID"),
  supplierProductsController.deleteProduct
);

/**
 * @route   PUT /api/supplier-products/:id/unarchive
 * @desc    Unarchive/Restore a supplier product
 * @access  Private (Supplier)
 */
router.put(
  "/:id/unarchive",
  param("id").isUUID().withMessage("Invalid product ID"),
  supplierProductsController.unarchiveProduct
);

/**
 * @route   PUT /api/supplier-products/:id/inventory
 * @desc    Update product inventory
 * @access  Private (Supplier)
 */
router.put(
  "/:id/inventory",
  // roleMiddleware(["supplier"]),
  param("id").isUUID().withMessage("Invalid product ID"),
  supplierProductsController.updateInventory
);

/**
 * @route   POST /api/supplier-products/:id/prices
 * @desc    Manage product prices
 * @access  Private (Supplier)
 */
router.post(
  "/:id/prices",
  // roleMiddleware(["supplier"]),
  param("id").isUUID().withMessage("Invalid product ID"),
  validatePrice,
  supplierProductsController.managePrices
);

/**
 * @route   GET /api/supplier-products/:id/price-history
 * @desc    Get price history for a product
 * @access  Private (Supplier, Coop Admin)
 */
router.get(
  "/:id/price-history",
  param("id").isUUID().withMessage("Invalid product ID"),
  supplierProductsController.getPriceHistory
);

export default router;
