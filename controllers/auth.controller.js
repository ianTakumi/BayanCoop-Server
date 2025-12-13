import { supabase } from "../utils/supabase_client.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmationEmail,
} from "../configs/nodemailer.config.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// User Registration
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
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (checkError) {
      console.error("User not found in users table:", checkError.message);
      return res.status(404).json({ error: "User not found" });
    }

    // Then update
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({
        status: "verified",
        email_verified: true,
        updated_at: currentTimestamp,
      })
      .eq("id", userId);

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

export const refreshSession = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    console.log(req.body);
    if (!refresh_token) {
      return res
        .status(400)
        .json({ message: "Refresh token is required", success: false });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refresh_token,
    });

    if (error) {
      console.log("❌ Supabase refresh error:", error.message);
      return res.status(401).json({
        message: "Invalid or expired refresh token",
        success: false,
        error: error.message,
      });
    }

    if (!data.session) {
      return res.status(401).json({
        message: "No session returned after refresh",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Successfully refreshed the session",
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        session: data.session,
      },
    });
  } catch (err) {
    console.log("Error refreshing token", err);
  }
};

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

// Send password reset email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false,
      });
    }

    // Generate tokens
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const shortCode = token.substring(0, 6).toUpperCase();

    // Get user by email (case-insensitive)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, first_name") // Get name for personalization
      .ilike("email", email) // Use ilike for case-insensitive search
      .single();

    if (userError || !userData) {
      // For security, don't reveal if user exists or not
      console.log("Password reset requested for non-existent email:", email);
      return res.status(200).json({
        message:
          "If an account exists with this email, you will receive a reset code shortly.",
        success: true,
      });
    }

    const userId = userData.id;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing unused reset tokens for this user
    const { error: deleteError } = await supabase
      .from("password_resets")
      .delete()
      .eq("user_id", userId)
      .eq("used", false);

    if (deleteError) {
      console.error("Error deleting old reset tokens:", deleteError);
    }

    // Insert new reset token
    const { data: resetData, error: insertError } = await supabase
      .from("password_resets")
      .insert({
        user_id: userId,
        token_hash: hashedToken,
        short_code: shortCode,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        used: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting reset token:", insertError);
      return res.status(500).json({
        message: "Failed to create reset token",
        success: false,
        error: insertError.message,
      });
    }

    // Send email with reset instructions
    try {
      // Use the resetPasswordEmail function we created earlier
      await sendPasswordResetEmail(
        userData.first_name || "User",
        email, // Use the original email from request
        shortCode,
        token, // Send full token for the reset link
        "15 minutes"
      );

      console.log(`Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Don't fail the request if email fails, just log it
    }

    // Return success (even if email fails for security)
    return res.status(200).json({
      message:
        "If an account exists with this email, you will receive a reset code shortly.",
      success: true,
      // For development/testing, include the short code
      ...(process.env.NODE_ENV === "development" && {
        shortCode: shortCode,
        token: token,
        expiresAt: expiresAt.toISOString(),
      }),
    });
  } catch (err) {
    console.error("Unexpected error in forgotPassword:", err);
    return res.status(500).json({
      message: "Server Error",
      success: false,
      error: err.message,
    });
  }
};

// Add this to your auth controller
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Token is required",
        success: false,
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Check if token exists and is valid
    const { data: resetData, error: resetError } = await supabase
      .from("password_resets")
      .select("*")
      .eq("token_hash", hashedToken)
      .eq("used", false)
      .single();

    if (resetError || !resetData) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
        success: false,
      });
    }

    // Check if token is expired
    const expiresAt = new Date(resetData.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      return res.status(400).json({
        message: "Reset token has expired",
        success: false,
      });
    }

    // Token is valid
    return res.status(200).json({
      message: "Token is valid",
      success: true,
      expiresAt: resetData.expires_at,
    });
  } catch (err) {
    console.error("Error verifying reset token:", err);
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: err.message,
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { newPassword, token } = req.body;

    if (!newPassword || !token) {
      return res.status(400).json({
        message: "New password and token are required",
        success: false,
      });
    }

    // Validate password strength
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        success: false,
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Check if token exists and is valid
    const { data: resetData, error: resetError } = await supabase
      .from("password_resets")
      .select("*")
      .eq("token_hash", hashedToken)
      .eq("used", false)
      .single();

    if (resetError || !resetData) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
        success: false,
      });
    }

    // Check if token is expired
    const expiresAt = new Date(resetData.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from("password_resets")
        .update({ used: true })
        .eq("id", resetData.id);

      return res.status(400).json({
        message: "Reset token has expired",
        success: false,
      });
    }

    // Check max attempts (optional security feature)
    if (resetData.attempts >= 5) {
      await supabase
        .from("password_resets")
        .update({ used: true })
        .eq("id", resetData.id);

      return res.status(400).json({
        message: "Too many reset attempts. Please request a new reset link.",
        success: false,
      });
    }

    const userId = resetData.user_id;

    // Update password in Supabase Auth
    try {
      // First, get the user's email from auth.users using admin API
      const { data: authUser, error: authUserError } =
        await supabase.auth.admin.getUserById(userId);

      if (authUserError || !authUser) {
        console.error("Error getting auth user:", authUserError);

        // Increment attempts
        await supabase
          .from("password_resets")
          .update({
            attempts: resetData.attempts + 1,
            last_attempt: new Date().toISOString(),
          })
          .eq("id", resetData.id);

        return res.status(400).json({
          message: "User not found in authentication system",
          success: false,
        });
      }

      // Update password using Supabase Auth Admin API
      const { data: updatedUser, error: authError } =
        await supabase.auth.admin.updateUserById(userId, {
          password: newPassword,
        });

      if (authError) {
        console.error("Supabase Auth update error:", authError);

        // Increment attempts
        await supabase
          .from("password_resets")
          .update({
            attempts: resetData.attempts + 1,
            last_attempt: new Date().toISOString(),
          })
          .eq("id", resetData.id);

        return res.status(400).json({
          message: "Failed to update password. Please try again.",
          success: false,
          error: authError.message,
        });
      }

      // Mark token as used
      await supabase
        .from("password_resets")
        .update({
          used: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resetData.id);

      // Optional: Invalidate all user sessions for security
      try {
        await supabase.auth.admin.signOut(userId);
      } catch (signOutError) {
        console.log(
          "Note: Could not sign out all sessions:",
          signOutError.message
        );
        // Continue anyway, this is non-critical
      }

      // Get user profile from custom users table for email
      try {
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("first_name, email")
          .eq("id", userId)
          .single();

        if (!profileError && userProfile) {
          // Send password change confirmation email
          await sendPasswordChangeConfirmationEmail(
            userProfile.first_name || "User",
            userProfile.email || authUser.user.email
          );
        } else {
          // Use email from auth if custom profile not found
          await sendPasswordChangeConfirmationEmail(
            "User",
            authUser.user.email
          );
        }
      } catch (emailError) {
        console.log("Password change email not sent:", emailError.message);
        // Non-critical, continue
      }

      return res.status(200).json({
        message: "Password updated successfully",
        success: true,
      });
    } catch (updateError) {
      console.error("Password update error:", updateError);
      return res.status(500).json({
        message: "Failed to update password",
        success: false,
        error: updateError.message,
      });
    }
  } catch (err) {
    console.error("Unexpected error in resetPassword:", err);
    return res.status(500).json({
      message: "Server Error",
      success: false,
      error: err.message,
    });
  }
};

// Update Password
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const { user_id } = req.params;

    if (!currentPassword || !newPassword || !confirmPassword || !user_id) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill up all the fields" });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password must match", success: false });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user_id, {
      password: newPassword,
    });

    if (error) throw error;

    res
      .status(200)
      .json({ message: "Password updated successfully", success: true });
  } catch (err) {
    console.log("Something went wrong: ", err);
    res.status(500).json({ message: "Something went wrong", success: false });
  }
};
