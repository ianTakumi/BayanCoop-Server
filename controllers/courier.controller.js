import { supabase } from "../utils/supabase_client";

// Create courier
export const createCourier = async (req, res) => {
  try {
    const coopId = req.params;
    const { first_name, last_name, dob, phone, email, password, maxCapacity } =
      req.body;
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get # of couriers based on coopID
export const getTotalCourierBasedCoopId = async (req, res) => {
  try {
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// For admin
export const getCouriers = async (req, res) => {
  try {
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

export const updateCourier = async (req, res) => {
  try {
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

export const deleteCourier = async (req, res) => {
  try {
    const { courierId } = req.params;
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update courier profile details
export const updateProfileDetails = async (req, res) => {
  try {
    const { first_name, last_name, age, phone, email, maxCapacity } = req.body;
    const courierId = req.params;

    if (!first_name || !last_name || !age || !phone || !email || !maxCapacity) {
      return res.status(400).json({ message: "Fill up all the fields" });
    }

    const { data, error } = supabase.from("couriers").update({}).select();

    if (error) throw error;

    return res
      .status(200)
      .json({ message: "Updated successfully", courier: data[0] });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
