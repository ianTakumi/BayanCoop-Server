import { userRegister, userLogin } from "../controllers/auth.controller.js";
import express from "express";

const router = express.Router();

// User Registration
router.post("/user-registration", userRegister);

// User login
router.post("/user-login", userLogin);

// Coop registration

// Courier Registration

export default router;
