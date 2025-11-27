import express from "express";
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  archiveEvent,
  deleteEvent,
  getUpcomingEvents,
  getEventsByDateRange,
  getEventsStats,
} from "../controllers/events.controller.js";

const router = express.Router();

// Public routes - no authentication required
router.get("/", getEvents);
router.get("/upcoming", getUpcomingEvents);
router.get("/stats", getEventsStats);
router.get("/range/:startDate/:endDate", getEventsByDateRange);
router.get("/:id", getEvent);

// CRUD routes - no authentication
router.post("/", createEvent);
router.put("/:id", updateEvent);
router.put("/:id/archive", archiveEvent);
router.delete("/:id", deleteEvent);

export default router;
