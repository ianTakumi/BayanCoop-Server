import { supabase } from "../utils/supabase_client.js";
import { sendVerificationEmail } from "../configs/nodemailer.config.js";

// User Registration
import jwt from "jsonwebtoken";

export const userRegister = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;

    // Create user with email confirmation disabled
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

    // Insert user record in your custom users table
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

      // Clean up: delete the auth user if DB insert fails
      await supabase.auth.admin.deleteUser(userId);

      return res.status(400).json({ error: insertError.message });
    }

    // Generate JWT verification token
    const verificationToken = jwt.sign(
      {
        id: userId,
        email: email,
        type: "email_verification",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send custom verification email with JWT token
    try {
      await sendVerificationEmail(
        `${firstName} ${lastName}`,
        email,
        verificationToken
      );
    } catch (emailError) {
      console.error("Custom email error:", emailError);

      // Clean up if email fails
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from("users").delete().eq("id", userId);

      return res
        .status(500)
        .json({ error: "Error sending verification email" });
    }

    return res.status(201).json({
      message:
        "User registered successfully! Please check your email for verification.",
      user: userRecord,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const verifyUser = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is for email verification
    if (decoded.type !== "email_verification") {
      return res.status(400).json({ error: "Invalid token type" });
    }

    const userId = decoded.id;
    const userEmail = decoded.email;

    // Get current timestamp for email_confirmed_at
    const currentTimestamp = new Date().toISOString();

    // Update user email confirmation status in Supabase Auth
    const { data: authUser, error: authError } =
      await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true,
        email_confirmed_at: currentTimestamp,
      });

    if (authError) {
      console.error("Supabase auth update error:", authError.message);
      return res
        .status(400)
        .json({ error: "Error confirming email in authentication system" });
    }

    // Update user status in custom users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({
        status: "verified",
        email_verified: true,
        updated_at: currentTimestamp,
      })
      .eq("id", userId)
      .select()
      .single();

    if (userError) {
      console.error("Users table update error:", userError.message);
      return res.status(400).json({ error: "Error updating user status" });
    }

    console.log(`✅ User ${userEmail} verified successfully`);

    return res.status(200).json({
      message: "Email verified successfully!",
      user: {
        id: userId,
        email: userEmail,
        status: "verified",
        email_confirmed_at: currentTimestamp,
      },
    });
  } catch (err) {
    console.error("Unexpected error on verifying user:", err);

    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Verification token has expired" });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Courier register
export const courierRegister = async (req, res) => {};

// User login
export const userLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Step 1: Sign in user with Supabase Auth
    const { data: authSession, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      console.error("Auth error:", authError.message);
      return res.status(400).json({ error: authError.message });
    }

    // Step 2: Get the user ID from session
    const userId = authSession.user?.id;

    console.log(userId);

    if (!userId) {
      return res.status(400).json({ error: "User ID not found in session" });
    }

    // Step 3: Fetch the user record from your `users` table
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    console.log(userRecord);
    if (userError) {
      console.error("User fetch error:", userError.message);
      return res.status(400).json({ error: userError.message });
    }

    // Step 4: Return both the session and user record
    return res.status(200).json({
      session: authSession.session,
      user: userRecord,
    });
  } catch (err) {
    console.error("Unexpected error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// Curier Login
export const courierLogin = async (req, res) => {};

// Send password reset email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // First, get the user by email to retrieve the user ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !userData) {
      console.log("User not found:", userError);
      return res.status(400).json({
        message: "No account found with this email address",
      });
    }

    const userId = userData.id;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL}/reset-password/`,
    });

    if (error) {
      console.log("Forgot password error:", error);
      return res.status(400).json({
        message: "Failed to send reset email",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Password reset email sent successfully",
    });
  } catch (err) {
    console.log("Unexpected error:", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { userId } = req.params;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    // Method 1: Update current user's password (requires user session)
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.log("Update password error:", error);
      return res.status(400).json({
        message: "Failed to update password",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (err) {
    console.log("Unexpected error:", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
