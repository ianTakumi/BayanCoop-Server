// Import packages
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import upload from "./configs/multer.middleware.js";
import { uploadImageToSupabase } from "./utils/helpers.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import userRoutes from "./routes/user.routes.js";
import coopRoutes from "./routes/cooperative.route.js";
import categoryRoutes from "./routes/category.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import eventRoutes from "./routes/events.routes.js";
import articleRoutes from "./routes/article.routes.js";

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
app.use(API_BASE + "/users", userRoutes);
app.use(API_BASE + "/coops", coopRoutes);
app.use(API_BASE + "/categories", categoryRoutes);
app.use(API_BASE + "/suppliers", supplierRoutes);
app.use(API_BASE + "/events", eventRoutes);
app.use(API_BASE + "/articles", articleRoutes);

app.post(
  API_BASE + "/upload/single",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      const publicUrl = await uploadImageToSupabase(
        req.file,
        req.body.folder || "uploads"
      );

      res.json({
        success: true,
        data: {
          url: publicUrl,
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        message: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

app.post(
  API_BASE + "/upload/multiple",
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files uploaded",
        });
      }

      const uploadPromises = req.files.map((file) =>
        uploadImageToSupabase(file, req.body.folder || "uploads")
      );

      const urls = await Promise.all(uploadPromises);

      res.json({
        success: true,
        data: urls.map((url, index) => ({
          url: url,
          filename: req.files[index].originalname,
          size: req.files[index].size,
          mimetype: req.files[index].mimetype,
        })),
        message: `${urls.length} images uploaded successfully`,
      });
    } catch (error) {
      console.error("Multiple upload error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
