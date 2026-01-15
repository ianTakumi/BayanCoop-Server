import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import upload from "./configs/multer.middleware.js";
import {
  uploadImageToSupabase,
  deleteImageFromSupabase,
} from "./utils/helpers.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import userRoutes from "./routes/user.routes.js";
import coopRoutes from "./routes/cooperative.route.js";
import categoryRoutes from "./routes/category.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import eventRoutes from "./routes/events.routes.js";
import articleRoutes from "./routes/article.routes.js";
import productRoutes from "./routes/product.routes.js";
import supplierProductRoutes from "./routes/supplierProducts.route.js";
import communityRoutes from "./routes/community.routes.js";
import attributeRoutes from "./routes/attribute.routes.js";
import courierRoutes from "./routes/courier.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";

dotenv.config();
const app = express();
const API_BASE = "/api/v1";

const httpServer = createServer(app);
global.io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Socket io
global.io.on("connection", (socket) => {
  console.log(`🔔 Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`🔔 Client disconnected: ${socket.id}`);
  });
});

// Routes
app.use(API_BASE + "/auth", authRoutes);
app.use(API_BASE + "/contacts", contactRoutes);
app.use(API_BASE + "/users", userRoutes);
app.use(API_BASE + "/coops", coopRoutes);
app.use(API_BASE + "/categories", categoryRoutes);
app.use(API_BASE + "/suppliers", supplierRoutes);
app.use(API_BASE + "/events", eventRoutes);
app.use(API_BASE + "/articles", articleRoutes);
app.use(API_BASE + "/products", productRoutes);
app.use(API_BASE + "/supplier-products", supplierProductRoutes);
app.use(API_BASE + "/communities", communityRoutes);
app.use(API_BASE + "/attributes", attributeRoutes);
app.use(API_BASE + "/couriers", courierRoutes);
app.use(API_BASE + "/carts", cartRoutes);
app.use(API_BASE + "/orders", orderRoutes);

// Image upload routes
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

// Delete single image route
app.delete(API_BASE + "/upload/single", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "Image URL is required",
      });
    }

    // Validate the URL format
    if (!imageUrl.includes("supabase.co/storage/v1/object/public/")) {
      return res.status(400).json({
        success: false,
        error: "Invalid Supabase storage URL",
      });
    }

    const deleted = await deleteImageFromSupabase(imageUrl);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: "Failed to delete image",
      });
    }

    res.json({
      success: true,
      message: "Image deleted successfully",
      data: {
        deletedUrl: imageUrl,
      },
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Bulk delete images route
app.post(API_BASE + "/upload/bulk-delete", async (req, res) => {
  try {
    const { imageUrls } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Image URLs array is required",
      });
    }

    // Validate all URLs
    const invalidUrls = imageUrls.filter(
      (url) => !url.includes("supabase.co/storage/v1/object/public/")
    );

    if (invalidUrls.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid Supabase storage URLs found: ${invalidUrls.length} URLs`,
        invalidUrls: invalidUrls,
      });
    }

    const deletionPromises = imageUrls.map((url) =>
      deleteImageFromSupabase(url).catch((error) => {
        console.error(`Failed to delete image ${url}:`, error);
        return { url, success: false, error: error.message };
      })
    );

    const results = await Promise.all(deletionPromises);

    const successfulDeletions = results.filter(
      (r) => r === true || (r && r.success === true)
    );
    const failedDeletions = results.filter(
      (r) => r !== true && (!r || r.success === false)
    );

    res.json({
      success: true,
      message: `Deleted ${successfulDeletions.length} of ${imageUrls.length} images`,
      data: {
        total: imageUrls.length,
        successful: successfulDeletions.length,
        failed: failedDeletions.length,
        failedDetails: failedDeletions,
      },
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔌 Socket.io available at: http://localhost:${PORT}`);
  console.log(`📡 REST API available at: http://localhost:${PORT}${API_BASE}`);
});
