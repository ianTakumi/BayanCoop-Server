import { supabase } from "./supabase_client.js";
import path from "path";

export const uploadImageToSupabase = async (file, folder = "events") => {
  try {
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${timestamp}-${Math.random()
      .toString(36)
      .substring(2)}${fileExtension}`;

    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("uploads").getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading image to Supabase:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// Function to delete image from Supabase
export const deleteImageFromSupabase = async (publicUrl) => {
  try {
    if (!publicUrl) {
      console.log("No public URL provided for deletion");
      return true;
    }

    // Remove the base URL part
    const baseUrl =
      "https://xcbgiyiklnoigcixjdxa.supabase.co/storage/v1/object/public/";
    const filePath = publicUrl.replace(baseUrl, "");

    console.log("Deleting file path:", filePath);

    // Delete the file from storage
    const { error } = await supabase.storage.from("uploads").remove([filePath]);

    if (error) {
      // Check if the error is "Object not found" (file doesn't exist)
      if (error.message && error.message.includes("not found")) {
        console.log("File not found, might already be deleted:", filePath);
        return true;
      }
      throw error;
    }

    console.log("Successfully deleted image:", filePath);
    return true;
  } catch (error) {
    console.error("Error deleting image from Supabase:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};
