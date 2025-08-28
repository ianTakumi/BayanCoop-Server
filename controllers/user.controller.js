import User from "../models/user.model.js";
import upload from "../configs/multer.middleware.js";

// Check email uniqueness
export const checkEmailUnique = async (req, res) => {
  try {
    const { email, id } = req.body;
    const query = id ? { email, _id: { $ne: id } } : { email };

    const existingUser = await User.findOne(query);

    if (existingUser) {
      console.log("Email is already taken");
      return res
        .status(400)
        .json({ message: "Email is already taken", isUnique: false });
    }

    return res
      .status(200)
      .json({ message: "Email is available", isUnique: true });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Deactivate user
export const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    user.status = "deactivated";
    await user.save();

    res.status(200).json({
      message: "User deactivated successfully",
      success: true,
    });
  } catch (err) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

// Activate user
export const activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    user.status = "activated";
    await user.save();

    res.status(200).json({
      message: "User activated successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ type: { $ne: "admin" } }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      data: users,
      message: "Users fetched successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server error",
      success: false,
    });
  }
};

// Get user account
export const getUserCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: { $ne: "admin" } });
    res.status(200).json({
      message: "Successfully retrieved user count excluding admins",
      success: true,
      count,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server error",
      success: false,
    });
  }
};

// Get single user
export const getSingleUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    res.status(200).json({
      message: "Sucessfully get user",
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

// Update admin profile
export const updateAdminProfile = async (req, res) => {
  try {
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};
