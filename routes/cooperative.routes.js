import express from "express";
import {
  cooperativeRegistration,
  cooperativeVerifyEmail,
} from "../controllers/cooperative.controller.js";

const router = express.Router();

// Cooperative registration
router.post("/cooperative-registration", cooperativeRegistration);

// Cooperative verify email
router.post("/cooperative-verify-email", cooperativeVerifyEmail);

export default router;
