import { supabase } from "../utils/supabase_client.js";

// Get all categories for admin
export const getAllCategoriesForAdmin = async (req, res) => {
  try {
  } catch (err) {
    console.log("Cannot get all categories for admin", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get all specific categories based on coop
export const getAllCategoriesForCoop = async (req, res) => {
  try {
  } catch (err) {
    console.log("Cannot get all categories for coop", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Create category for admin
export const createCategoryAdmin = async (req, res) => {
  try {
    const { name, coop, desc } = req.body;

    if (!name || !coop || !desc) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Generate a unique code from the name
    const categoryCode = name
      .toUpperCase()
      .replace(/\s+/g, "_")
      .substring(0, 10);

    // Insert into global_categories table
    const { data, error } = await supabase
      .from("global_categories")
      .insert([
        {
          name: name,
          code: categoryCode,
          desc: desc,
          is_active: true,
        },
      ])
      .select();

    if (error) throw error;

    return res.status(201).json({
      message: "Category created successfully",
      data: data[0],
    });
  } catch (err) {
    console.log("Cannot create category for admin", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Create category for coop
export const createCategoryCoop = async (req, res) => {
  try {
    const { coopId } = req.params;
    const { name, global_category_id, desc, custom_fields } = req.body;

    if (!coopId) {
      return res.status(400).json({ message: "Coop ID is required" });
    }

    if (!name || !global_category_id || !desc || !custom_fields) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Generate code from name
    const categoryCode = name
      .toUpperCase()
      .replace(/\s+/g, "_")
      .substring(0, 10);

    // Insert into coop_categories table
    const { data, error } = await supabase.from("coop_categories").insert([
      {
        coop_id: coopId,
        global_category_id: global_category_id,
        coop_category_name: name,
        coop_category_code: categoryCode,
        description: desc || null,
        custom_fields: custom_fields || null,
        is_active: true,
        created_date: new Date().toISOString(),
      },
    ]).select(`
        *,
        global_categories (
          global_category_name,
          global_category_code
        )
      `);

    if (error) throw error;

    return res.status(201).json({
      message: "Cooperative category created successfully",
      data: data[0],
    });
  } catch (err) {
    console.log("Cannot create category for coop", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
