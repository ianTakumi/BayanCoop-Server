import {
  createSupplier,
  getSuppliers,
} from "../controllers/supplier.controller.js";
import express from "express";

const router = express.Router();

// GET
router.get("/", getSuppliers);

// Create supplier
router.post("/", createSupplier);

export default router;
