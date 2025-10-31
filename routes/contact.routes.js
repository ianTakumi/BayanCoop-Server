import {
  getTotalCount,
  getContacts,
  createContact,
  updateContact,
} from "../controllers/contact.controller.js";
import express from "express";

const router = express.Router();

// Get total # of contacts for admin dashboard
router.get("/total-contact-count", getTotalCount);

// Get all contacts
router.get("/", getContacts);

// Create contact
router.post("/", createContact);

// Update status of a contact  for admin
router.put("/:id", updateContact);

export default router;
