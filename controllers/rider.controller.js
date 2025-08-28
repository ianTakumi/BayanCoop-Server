import Rider from "../models/rider.model.js";
import jwt, { decode } from "jsonwebtoken";
import User from "../models/user.model.js";

// Rider Registration
export const riderRegistration = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Riger login
export const riderLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the email and password is provided
    if (!email || !password) {
      return res
        .status(404)
        .json({ message: "Email or password is missing", success: false });
    }

    const normalizedEmail = email.toLowerCase();
    const rider = Rider.findOne({ email: normalizedEmail });

    // Check if there is a rider based on the email
    if (!rider) {
      return res
        .status(404)
        .json({ message: "Rider not found", success: false });
    }

    // Check if the rider is verified
    if (rider.status === "unverified") {
      return res
        .status(400)
        .json({ message: "Please verify your email", success: false });
    }

    // Check if password is match
    const isMatch = await Rider.matchPassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid email or password", success: false });
    }

    await Rider.save();
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Rider verify email
export const riderVerifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(404).json({ message: "No token pass to the request" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const rider = Rider.findById(decoded.id);

    if (!rider) {
      return res.status(404).json({ message: "No rider found" });
    }

    rider.status = "verified";
    await rider.save();
    return res.status(200).json({ message: "Email verified", success: true });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};
