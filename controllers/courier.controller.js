import { supabase } from "../utils/supabase_client";

// Create courier
export const createCourier = async (req, res) => {
  try {
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
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
