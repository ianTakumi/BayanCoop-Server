// Import packages
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import contactRoutes from "./routes/contact.routes.js";

dotenv.config();
const app = express();
const API_BASE = "/api/v1";

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use(API_BASE + "/auth", authRoutes);
app.use(API_BASE + "/contacts", contactRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
