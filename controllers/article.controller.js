import { supabase } from "../utils/supabase_client.js";
import { v4 as uuidv4 } from "uuid";

export const uploadFile = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.files.file;
    const fileType = req.body.type || "general";

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${fileType}/${uuidv4()}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("articles") // Your bucket name
      .upload(fileName, file.data, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("articles").getPublicUrl(fileName);

    res.json({
      success: true,
      data: {
        url: publicUrl,
        filename: fileName,
        originalName: file.name,
        size: file.size,
        mimetype: file.mimetype,
      },
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message,
    });
  }
};
