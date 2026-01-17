import express from "express";
import {
  getCouriers,
  getSingleCourierBasedOnId,
  getCourierByUserId,
  getCouriersBasedOnCoopId,
  createCourier,
  archiveCourier,
  unArchiveCourier,
  updateCourier,
  updateCourierStatus,
} from "../controllers/courier.controller.js";

const router = express.Router();

// Get all couriers
router.get("/", getCouriers);

// Get couriers based on cooperative ID
router.get("/cooperative/:cooperativeId", getCouriersBasedOnCoopId);

// Get single courier by ID
router.get("/:courierId", getSingleCourierBasedOnId);

// Get courier by user ID
router.get("/user/:userId", getCourierByUserId);

// Create courier
router.post("/", createCourier);

// Update courier profile
router.put("/:courierId", updateCourier);

// Update courier status
router.put("/:courierId/status", updateCourierStatus);

// Archive courier
router.put("/:courierId/archive", archiveCourier);

// Restore/Unarchive courier
router.put("/:courierId/restore", unArchiveCourier);

export default router;
