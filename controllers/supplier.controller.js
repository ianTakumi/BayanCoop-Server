import { supabase } from "../utils/supabase_client.js";
import {
  sendVerificationEmail,
  supplierRegistrationPendingEmail,
} from "../configs/nodemailer.config.js";
import jwt from "jsonwebtoken";

// Get Suppliers for admin
export const getSuppliers = async (req, res) => {
  try {
    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select(
        `
        *,
        user:users (
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          created_at
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Suppliers retrieved successfully",
      data: suppliers || [],
    });
  } catch (err) {
    console.error("Get suppliers error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      email,
      password,
      business_name,
      business_email,
      business_phone,
      business_type,
      type,
      address,
      barangay,
      city,
      province,
      region,
    } = req.body;

    // Validation
    if (
      !first_name ||
      !last_name ||
      !phone ||
      !email ||
      !password ||
      !business_name ||
      !business_email ||
      !business_phone ||
      !business_type ||
      !type
    ) {
      return res.status(400).json({
        message:
          "Required fields: first_name, last_name, phone, email, password, business_name, business_email, business_phone, business_type, type",
      });
    }

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        data: {
          first_name: first_name,
          last_name: last_name,
          phone: phone,
          role: "supplier",
        },
      },
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return res.status(400).json({
        message: "Auth registration failed",
        error: authError.message,
      });
    }

    const userId = authData.user.id;

    // Step 2: Insert into users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          id: userId,
          first_name: first_name,
          last_name: last_name,
          email: email.toLowerCase(),
          phone: phone,
          role: "supplier",
          status: "pending",
          email_verified: false,
          // Let Supabase handle timestamps automatically
        },
      ])
      .select()
      .single();

    if (userError) {
      console.error("Users table insert error:", userError);

      // Rollback: Delete the auth user if user table insert fails
      await supabase.auth.admin.deleteUser(userId);

      return res.status(500).json({
        message: "Error creating user profile",
        error: userError.message,
      });
    }

    // Step 3: Insert into suppliers table
    const { data: supplierData, error: supplierError } = await supabase
      .from("suppliers")
      .insert([
        {
          user_id: userId,
          name: business_name,
          email: business_email.toLowerCase(),
          phone: business_phone,
          business_type: business_type,
          type: type,
          address: address,
          barangay: barangay,
          city: city,
          province: province,
          region: region,
          status: "pending",
          // Let Supabase handle timestamps automatically
        },
      ])
      .select()
      .single();

    if (supplierError) {
      console.error("Suppliers table insert error:", supplierError);
      console.error(
        "Full error details:",
        JSON.stringify(supplierError, null, 2)
      );

      // Rollback: Delete from users table and auth
      await supabase.from("users").delete().eq("id", userId);
      await supabase.auth.admin.deleteUser(userId);

      return res.status(500).json({
        message: "Error creating supplier profile",
        error: supplierError.message,
        details: supplierError.details || "No additional details",
      });
    }

    // Step 4: Send email notification to supplier
    await supplierRegistrationPendingEmail(
      `${first_name} ${last_name}`,
      email,
      business_name
    );

    // Step 5: Generate JWT verification token
    const verificationToken = jwt.sign(
      {
        id: userId,
        email: email,
        type: "email_verification",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send custom verficiation email
    await sendVerificationEmail(
      `${first_name} ${last_name}`,
      email,
      verificationToken
    );

    return res.status(201).json({
      message:
        "Supplier registration submitted successfully. Please check your email for confirmation.",
    });
  } catch (err) {
    console.error("Create supplier error:", err.message);

    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { status } = req.body;
    const { supplierId } = req.params;

    if (!status || !supplierId) {
      return res
        .status(400)
        .json({ message: "All fields are required and the supplier id" });
    }
  } catch (err) {
    console.error("Update supplier error:", err.message);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

export const archiveSupplier = async (req, res) => {
  try {
  } catch (err) {
    console.error("Archive supplier error:", err.message);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get suppliers for dropdown (for product form)
export const getSuppliersForDropdown = async (req, res) => {
  try {
    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("id, name, contact_person, phone, email")
      .eq("status", "active")
      .order("name");

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: suppliers || [],
    });
  } catch (err) {
    console.error("Get suppliers for dropdown error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get supplier by ID
export const getSupplierById = async (req, res) => {
  try {
    const { supplierId } = req.params;

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
      });
    }

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .select(
        `
        *,
        user:users (
          first_name,
          last_name,
          email,
          phone,
          status
        )
      `
      )
      .eq("id", supplierId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (err) {
    console.error("Get supplier by ID error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get supplier by owner id(via user_id)
export const getSupplierByOwnerId = async (req, res) => {
  try {
    const { owner_id } = req.params;

    if (!owner_id) {
      return res
        .status(400)
        .json({ message: "Owner ID is required", success: false });
    }

    const { data: supplier, error: error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("user_id", owner_id)
      .maybeSingle();

    if (error) throw error;

    if (!supplier) {
      return res
        .status(404)
        .json({ message: "Supplier not found for this owner" });
    }
    return res.status(200).json({ success: true, data: supplier });
  } catch (err) {
    console.error("Get supplier by owner id error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};
