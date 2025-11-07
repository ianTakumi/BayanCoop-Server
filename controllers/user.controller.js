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

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
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
    const {
      email,
      first_name,
      last_name,
      phone,
      address,
      region,
      province,
      city,
      barangay,
    } = req.body;
    const { userId } = req.params;

    if (
      !email ||
      !first_name ||
      !last_name ||
      !phone ||
      !address ||
      !region ||
      !province ||
      !city ||
      !barangay
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate user ID
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.updateUserById(userId, {
        email: email,
        user_metadata: {
          first_name: first_name,
          last_name: last_name,
          phone: phone,
        },
      });

    if (authError) {
      console.log("Auth update error:", authError);
      return res.status(400).json({
        message: "Failed to update auth profile",
        error: authError.message,
      });
    }

    const { data: dbData, error: dbError } = await supabase
      .from("users")
      .update({
        email: email,
        first_name: first_name,
        last_name: last_name,
        phone: phone,
        address: address,
        region: region,
        province: province,
        city: city,
        barangay: barangay,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select();

    if (dbError) {
      console.log("Database update error:", dbError);
      return res.status(400).json({
        message: "Failed to update user in database",
        error: dbError.message,
      });
    }

    // Check if user was actually updated in database
    if (!dbData || dbData.length === 0) {
      return res.status(404).json({ message: "User not found in database" });
    }

    console.log(dbData[0]);
    return res.status(200).json({
      message: "Profile updated successfully",
      user: dbData[0],
    });
  } catch (err) {
    console.log("Unexpected error:", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
