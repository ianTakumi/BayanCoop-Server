// Import packages
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import mongoose from "mongoose";

// Import routes

dotenv.config();
const app = express();
const API_BASE = "/api/v1";

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(
        "Working and Running!!! Connected to db & listening on port",
        process.env.PORT
      );
    });
  })
  .catch((error) => {
    console.log(error);
  });
