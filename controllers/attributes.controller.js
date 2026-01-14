import { supabase } from "../utils/supabase_client.js";

export const getAttributes = async (req, res) => {
  try {
    const { data, error } = await supabase.from("attributes").select("*");

    if (error) {
      throw error;
    }

    res.status(200).json({ data, success: true });
  } catch (err) {
    console.error("Error fetching attributes:", err);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

// Sa attributes.controller.js
export const getAttributesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const { data: attributes, error } = await supabase
      .from("attributes")
      .select("*")
      .eq("category_id", categoryId)
      .order("name", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Attributes fetched successfully",
      data: attributes || [],
    });
  } catch (err) {
    console.error("Error getting attributes by category: ", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const createAttribute = async (req, res) => {
  try {
    const { name, category_id } = req.body;

    if (!name || !category_id) {
      return res
        .status(400)
        .json({ error: "Name and category_id are required", success: false });
    }

    const { data, error } = await supabase
      .from("attributes")
      .insert([{ name, category_id }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({ data, success: true });
  } catch (err) {
    console.error("Error creating attribute:", err);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

export const updateAttribute = async (req, res) => {
  try {
    const { name, category_id } = req.body;
    const { id } = req.params;

    if (!name || !category_id) {
      return res
        .status(400)
        .json({ error: "Name and category_id are required", success: false });
    }

    const { data, error } = await supabase
      .from("attributes")
      .update({ name, category_id })
      .eq("attribute_id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({ data, success: true });
  } catch (err) {
    console.error("Error updating attribute:", err);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

export const deleteAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("attributes")
      .delete()
      .eq("attribute_id", id);

    if (error) {
      throw error;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error deleting attribute:", err);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};
