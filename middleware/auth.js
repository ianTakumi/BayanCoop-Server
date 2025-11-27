import jwt from "jsonwebtoken";
import { supabase } from "../utils/supabase_client.js";

// PROPER JWT VERIFICATION MIDDLEWARE USING SUPABASE CLIENT
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    // Verify token using Supabase client
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.log("Supabase auth error:", error.message);
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach user information
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || "user",
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name,
      phone: user.user_metadata?.phone,
      email_verified: !!user.email_confirmed_at,
      session_id: user.id, // You can modify this if you need actual session ID
    };

    console.log("✅ Authenticated user:", {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

    next();
  } catch (error) {
    console.log("Authentication error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Role-based authorization (same as before)
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required roles: ${allowedRoles.join(
          ", "
        )}`,
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireCoopAdminOrAdmin = requireRole(["admin", "coop_admin"]);
export const requireAuth = requireRole(["admin", "coop_admin", "coop", "user"]);
