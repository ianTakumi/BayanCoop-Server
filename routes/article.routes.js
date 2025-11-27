import express from "express";
import { uploadFile } from "../controllers/article.controller.js";
import upload from "../configs/multer.middleware.js";

const router = express.Router();

// Upload file
router.post("/upload-file", uploadFile);

export default router;
