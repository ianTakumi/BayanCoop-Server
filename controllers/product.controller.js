import { supabase } from "../utils/supabase_client";

// Get all products for admin
export const getAllProductsForAdmin = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        cooperatives_products (
          cooperatives (*)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      message: "Products fetched successfully",
      data: data,
    });
  } catch (err) {
    console.log("Error getting products for admin: ", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Create product
export const createProduct = async (req, res) => {
  try {
    const { coopId } = req.params;
    const { name, description } = req.body;
  } catch (err) {
    console.log("Error creating product: ", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update product

// Delete product
