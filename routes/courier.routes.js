import express from "express";
import { createCourier } from "../controllers/courier.controller";
import upload from "../configs/multer.middleware";

const router = express.Router();

// Create courier
router.post(
  "/:coopId",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "licenseFront", maxCount: 1 },
    { name: "licenseBack", maxCount: 1 },
  ]),
  createCourier
);

// Update courier details
// router.post("/update-profile-details",);
// Update courier profile picture

export default router;
