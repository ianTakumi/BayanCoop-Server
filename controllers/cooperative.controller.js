import { supabase } from "../utils/supabase_client.js";

// Get total count of cooperatives
export const getTotalCount = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from("cooperatives")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    return res
      .status(200)
      .json({ message: "Total count fetched successfully", total: count });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get all cooperatives for admin
export const getCooperatives = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("cooperatives")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      message: "Cooperatives fetched successfully",
      data,
      count: data?.length || 0,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Create cooperative
export const createCooperative = async (req, res) => {
  try {
    const {
      coopName,
      email,
      latitude,
      longitude,
      phone,
      provinceName,
      regionName,
      cityName,
      barangayName,
      address,
      completeAddress,
      userId,
      postalCode,
    } = req.body;

    if (
      !coopName ||
      !email ||
      !latitude ||
      !longitude ||
      !phone ||
      !provinceName ||
      !regionName ||
      !cityName ||
      !barangayName ||
      !address ||
      !completeAddress ||
      !userId ||
      !postalCode
    ) {
      return res.status(400).json({ message: "Please fill up all the fields" });
    }

    const { data, error } = await supabase
      .from("cooperatives")
      .insert([
        {
          name: coopName,
          email,
          latitude,
          longitude,
          phone,
          province: provinceName,
          region: regionName,
          city: cityName,
          barangay: barangayName,
          address,
          completeAddress,
          user_id: userId,
          postalCode,
        },
      ])
      .select();

    if (error) throw error;

    return res.status(201).json({
      message: "Cooperative created successfully",
      data: data[0],
    });
  } catch (err) {
    console.error("Create cooperative error:", err.message);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update profile
export const updateCooperative = async (req, res) => {
  try {
  } catch (err) {
    console.error("Update cooperative error:", err.message);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
