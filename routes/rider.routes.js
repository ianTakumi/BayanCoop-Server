import express from "express";
import {
  riderRegistration,
  riderLogin,
  riderVerifyEmail,
} from "../controllers/rider.controller.js";

const router = express.Router();

// Rider registration
router.post("/rider-registration", riderRegistration);

// Rider login
router.post("/rider-login", riderLogin);

// Rider verify email
router.post("/rider-verify-email", riderVerifyEmail);

export default router;
