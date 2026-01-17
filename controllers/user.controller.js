import { supabase } from "../utils/supabase_client.js";

// Get total # of users
export const getTotalUsers = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    return res.status(200).json({
      message: "Total count of users fetched successfully",
      total: count,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
// Get all users except suppliers
export const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .neq("role", "supplier") // Exclude users with role 'supplier'
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      message: "Users fetched successfully",
      data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get total # of active users
export const getActiveUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    // 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Count users whose last_sign_in_at is within the last 7 days
    const activeUsers = data.users.filter((user) => {
      const lastSignIn = user.last_sign_in_at
        ? new Date(user.last_sign_in_at)
        : null;
      return lastSignIn && lastSignIn >= sevenDaysAgo;
    });

    return res.status(200).json({
      totalActive: activeUsers.length,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get total # of inactive users
export const getInactiveUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Count users whose last_sign_in_at is older than 7 days or null
    const inactiveUsers = data.users.filter((user) => {
      const lastSignIn = user.last_sign_in_at
        ? new Date(user.last_sign_in_at)
        : null;
      return !lastSignIn || lastSignIn < sevenDaysAgo;
    });

    return res.status(200).json({
      totalInactive: inactiveUsers.length,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get total # of new users on the current month
export const getNewUsers = async (req, res) => {
  try {
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Create user for admin
export const createUser = async (req, res) => {
  try {
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Suspend the user(For admin )
export const suspendUser = async (req, res) => {
  try {
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Unsuspend (For admin)
export const unsuspendUser = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;

    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          phone,
          role: "user",
        },
      });

    if (authError) {
      console.error("Auth error:", authError.message);
      return res.status(400).json({ error: authError.message });
    }

    const userId = authUser.user.id;

    const { data: userRecord, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          role: "user",
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError.message);
      return res.status(400).json({ error: insertError.message });
    }

    const { error: emailError } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });

    if (emailError) {
      console.error("Error sending verification email:", emailError.message);
      return res
        .status(500)
        .json({ error: "Error sending confirmation email" });
    }

    return res.status(201).json({
      message: "User registered successfully!",
      user: userRecord,
    });
  } catch (err) {
    console.log("Unexpected error:", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("User ID:", req.params.userId);

    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      region,
      province,
      city,
      barangay,
      dob,
      gender,
    } = req.body;
    const { userId } = req.params;

    if (
      !first_name ||
      !last_name ||
      !email ||
      !phone ||
      !address ||
      !region ||
      !province ||
      !city ||
      !barangay ||
      !dob ||
      !gender
    ) {
      console.log("Validation failed: Missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate user ID
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if user exists first
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id, email, phone, first_name, last_name")
      .eq("id", userId)
      .single();

    if (userCheckError) {
      console.log("User check error:", userCheckError);
      return res.status(404).json({
        message: "User not found in database",
        error: userCheckError.message,
      });
    }

    if (!existingUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    console.log("Existing user found:", existingUser);

    // Check if email already exists (excluding current user) - only if email changed
    if (email !== existingUser.email) {
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .neq("id", userId)
        .single();

      if (emailCheckError && emailCheckError.code !== "PGRST116") {
        console.log("Email check error:", emailCheckError);
        return res.status(400).json({
          message: "Error checking email availability",
          error: emailCheckError.message,
        });
      }

      if (existingEmail) {
        return res.status(409).json({
          message: "Email already registered by another user",
        });
      }
    }

    // Check if phone already exists (excluding current user) - only if phone changed
    if (phone !== existingUser.phone) {
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .neq("id", userId)
        .single();

      if (phoneCheckError && phoneCheckError.code !== "PGRST116") {
        console.log("Phone check error:", phoneCheckError);
        return res.status(400).json({
          message: "Error checking phone availability",
          error: phoneCheckError.message,
        });
      }

      if (existingPhone) {
        return res.status(409).json({
          message: "Phone number already registered by another user",
        });
      }
    }

    // Update data object
    const updateData = {
      first_name: first_name,
      last_name: last_name,
      email: email,
      phone: phone,
      address: address,
      region: region,
      province: province,
      city: city,
      barangay: barangay,
      dob: dob,
      gender: gender,
      updated_at: new Date().toISOString(),
    };

    console.log("Update data:", updateData);

    // DIRECT UPDATE WITH SELECT - MAS RELIABLE
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select() // Direct select after update
      .single(); // Get single record

    if (updateError) {
      console.log("Database update error:", updateError);
      return res.status(400).json({
        message: "Failed to update user in database",
        error: updateError.message,
      });
    }

    if (!updatedUser) {
      console.log("No user data returned after update");
      return res.status(404).json({
        message: "User not found after update",
      });
    }

    console.log("Updated user returned directly:", updatedUser);

    // Update auth user (optional - can run in background)
    try {
      const authUpdate = await supabase.auth.admin.updateUserById(userId, {
        email: email,
        user_metadata: {
          first_name,
          last_name,
          email,
          phone,
          region,
          province,
          city,
          barangay,
          dob,
          gender,
        },
      });

      if (authUpdate.error) {
        console.log("Auth update warning:", authUpdate.error);
        // Don't fail the request if auth update fails, just log it
      } else {
        console.log("Auth user updated successfully");
      }
    } catch (authError) {
      console.log("Auth update error (non-critical):", authError);
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.log("Unexpected error:", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update user address
export const updateUserAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { address, region, province, city, barangay } = req.body;
    console.log(req.body);
    if (!address || !region || !province || !city || !barangay) {
      return res
        .status(400)
        .json({ message: "All address fields are required" });
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        address,
        region,
        province,
        city,
        barangay,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      message: "Address updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.log("Unexpected error:", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
