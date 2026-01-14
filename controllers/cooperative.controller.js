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

// Get single coop
export const getSingleCoop = async (req, res) => {
  try {
    const { coopId } = req.params;

    if (!coopId) {
      return res.status(400).json({ message: "Coop ID is required" });
    }

    // Get single coop by ID
    const { data, error } = await supabase
      .from("cooperatives")
      .select("*")
      .eq("id", coopId)
      .single(); // Use .single() to get only one record

    if (error) {
      if (error.code === "PGRST116") {
        // Record not found
        return res.status(404).json({ message: "Cooperative not found" });
      }
      throw error;
    }

    if (!data) {
      return res.status(404).json({ message: "Cooperative not found" });
    }

    return res.status(200).json({
      message: "Cooperative retrieved successfully",
      data: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get coop based on user id
export const getCoopBasedOnOwner = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId.trim() === "") {
      return res.status(400).json({
        message: "Valid user id is required",
      });
    }

    const { data, error } = await supabase
      .from("cooperatives")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log("No coop");
      return res.status(404).json({
        message: "No cooperative found for this user",
      });
    }

    return res
      .status(200)
      .json({ message: "Successfully fetched coop info", coop: data });
  } catch (err) {
    console.log("Something went wrong: ", err);
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
    console.log("Request body:", req.body);
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
    const {
      name,
      email,
      phone,
      region,
      province,
      city,
      barangay,
      postalCode,
      address,
      completeAddress,
      latitude,
      longitude,
    } = req.body;
    const { coopId } = req.params;
    console.log("Update request body:", req.body, coopId);
    if (
      !name ||
      !email ||
      !phone ||
      !region ||
      !province ||
      !city ||
      !barangay ||
      !postalCode ||
      !address ||
      !completeAddress ||
      !latitude ||
      !longitude
    ) {
      return res.status(400).json({ message: "Please fill up all the fields" });
    }

    if (!coopId) {
      return res.status(400).json({ message: "Coop ID is required" });
    }

    const { data, error } = await supabase
      .from("cooperatives")
      .update({
        name,
        email,
        phone,
        province,
        region,
        city,
        barangay,
        postalCode,
        address,
        completeAddress,
        latitude,
        longitude,
      })
      .eq("id", coopId)
      .select();

    if (error) throw error;

    return res
      .status(200)
      .json({ message: "Coop updated successfully", coop: data[0] });
  } catch (err) {
    console.error("Update cooperative error:", err.message);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update coop status (approve/reject)
export const updateCoopStatus = async (req, res) => {
  try {
    const { coopId } = req.params;
    const { isApproved } = req.body;

    if (!coopId) {
      return res.status(400).json({ message: "Cooperative ID is required" });
    }

    if (typeof isApproved !== "boolean") {
      return res
        .status(400)
        .json({ message: "isApproved must be a boolean value" });
    }

    const { data, error } = await supabase
      .from("cooperatives")
      .update({ isApproved: isApproved })
      .eq("id", coopId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Cooperative not found" });
    }

    const status = isApproved ? "approved" : "rejected";
    res.status(200).json({
      message: `Cooperative successfully ${status}`,
      data: data[0],
    });
  } catch (err) {
    console.error("Update coop status error:", err.message);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Soft delete coop
export const softDelete = async (req, res) => {
  try {
  } catch (err) {
    console.error("Delete contact error:", err.message);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
