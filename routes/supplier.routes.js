import {
  createSupplier,
  getSupplierById,
  getSupplierByOwnerId,
  getSuppliers,
  getSuppliersForDropdown,
} from "../controllers/supplier.controller.js";
import express from "express";

const router = express.Router();

// For dropdown (product form)
router.get("/dropdown", getSuppliersForDropdown); // GET /api/suppliers/dropdown

// Get single supplier based on owner_id
router.get("/:owner_id", getSupplierByOwnerId);

// Admin
router.get("/admin", getSuppliers);
router.get("/admin/:supplierId", getSupplierById);

// Create supplier
router.post("/", createSupplier);

export default router;
