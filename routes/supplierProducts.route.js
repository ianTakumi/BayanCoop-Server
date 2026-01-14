import express from "express";
import supplierProductsController from "../controllers/supplierProducts.controller.js";
import { body, param } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Validation middleware
const validateProduct = [
  body("supplier_id").notEmpty().withMessage("Supplier ID is required"),
  body("name").notEmpty().withMessage("Product name is required"),
  body("category_id").notEmpty().withMessage("Category ID is required"),
  body("unit_type").notEmpty().withMessage("Unit type is required"),
  body("base_price")
    .isFloat({ min: 0 })
    .withMessage("Base price must be a positive number"),
  body("min_order_quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Minimum order quantity must be at least 1"),
  body("status")
    .optional()
    .isIn([
      "active",
      "inactive",
      "out_of_stock",
      "low_stock",
      "pending",
      "archived",
    ])
    .withMessage("Invalid status value"),
  body("images").optional().isArray().withMessage("Images must be an array"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("attributes")
    .optional()
    .isArray()
    .withMessage("Attributes must be an array"),
];

const validateUpdateProduct = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Product name cannot be empty"),
  body("category_id")
    .optional()
    .notEmpty()
    .withMessage("Category ID cannot be empty"),
  body("base_price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Base price must be a positive number"),
  body("status")
    .optional()
    .isIn([
      "active",
      "inactive",
      "out_of_stock",
      "low_stock",
      "pending",
      "archived",
    ])
    .withMessage("Invalid status value"),
  body("attributes")
    .optional()
    .isArray()
    .withMessage("Attributes must be an array"),
];

const validateStatusUpdate = [
  body("status")
    .notEmpty()
    .isIn([
      "active",
      "inactive",
      "out_of_stock",
      "low_stock",
      "pending",
      "archived",
    ])
    .withMessage(
      "Valid status is required: active, inactive, out_of_stock, low_stock, pending, archived"
    ),
  body("reason").optional().isString().withMessage("Reason must be a string"),
];

// All routes require authentication (uncomment if needed)
// router.use(authenticateToken);

// Product routes
router.get("/", supplierProductsController.getAllProducts);
router.get(
  "/supplier/:supplierId",
  supplierProductsController.getSupplierProducts
);
router.get("/stats/:supplierId", supplierProductsController.getProductStats);
router.get("/:id", supplierProductsController.getProductById);
router.post("/", validateProduct, supplierProductsController.createProduct);
router.put(
  "/:id",
  validateUpdateProduct,
  supplierProductsController.updateProduct
);
router.delete("/:id", supplierProductsController.deleteProduct);
router.put("/:id/unarchive", supplierProductsController.unarchiveProduct);
router.put(
  "/:id/status",
  validateStatusUpdate,
  supplierProductsController.updateProductStatus
);

// Utility routes
router.get(
  "/categories/dropdown",
  supplierProductsController.getCategoriesDropdown
);
router.get(
  "/attributes/category/:categoryId",
  supplierProductsController.getAttributesByCategory
);

export default router;
