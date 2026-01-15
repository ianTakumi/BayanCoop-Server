// routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  getOrdersByUser,
  getOrdersByCoop,
  getOrderByIdForCoop,
  updateOrderItemStatus,
} from "../controllers/order.controller.js";

const router = express.Router();

// Get orders based on userId
router.get("/user/:userId", getOrdersByUser);

// Get orders by cooperative ID with filters
router.get("/coop/:coopId", getOrdersByCoop);

// Get specific order by ID for a cooperative
router.get("/coop/:coopId/order/:orderId", getOrderByIdForCoop);

// Create new order
router.post("/", createOrder);

// Update order item status (for cooperative)
router.patch("/coop/:coopId/item/:orderItemId", updateOrderItemStatus);

export default router;
