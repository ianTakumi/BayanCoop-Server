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
      .from("uploads") // Make sure this bucket exists in your Supabase storage
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
