import {
  getCartItems,
  createCartItem,
  removeCartItem,
  updateCartItem,
} from "../controllers/cart.controller.js";
import express from "express";

const router = express.Router();

// Get cart items for a specific user
router.get("/:userId", getCartItems);

// Create cart item
router.post("/", createCartItem);

// Update cart item
router.put("/:cartItemId", updateCartItem);

// Delete cart item
router.delete("/:cartItemId", removeCartItem);

export default router;
