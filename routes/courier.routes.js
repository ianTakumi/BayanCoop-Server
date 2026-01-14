import express from "express";
import {
  archiveCourier,
  createCourier,
  getCouriers,
  getSingleCourierBasedOnId,
  unArchiveCourier,
  updateCourier,
} from "../controllers/courier.controller.js";

const router = express.Router();

// Get all couriers
router.get("/", getCouriers);

// Get single courier
router.get("/:courierId", getSingleCourierBasedOnId);

// Create courier
router.post("/", createCourier);

// Archive courier
router.put("/:courierId/archive", archiveCourier);

// Restore courier
router.put("/:courierId/restore", unArchiveCourier);

// Update courier profile
router.put("/:courierId", updateCourier);

export default router;
