import User from "../models/User.js";
import connectDB from "../config/db.js"
import mongoose from "mongoose";


// @desc Get All Users (Admin Only)
export const getAllUsers = async (req, res) => {
  try {
    await connectDB()
    const users = await User.find().select("-password -refreshToken");
    return res.json(users);
  } catch {
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

// @desc Get User By ID
export const getUserById = async (req, res) => {
  try {
    const id = req.params.id
    await connectDB()
    const user = await User.findById(id).select("-password -refreshToken");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch {
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

// @desc Update User
export const updateUser = async (req, res) => {
  try {
    const { name, image, role } = req.body;
    await connectDB()
    // const redis = getRedisClient();

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, image, role },
      { new: true }
    ).select("-password -refreshToken");

    return res.json(updatedUser);
  } catch {
    return res.status(500).json({ message: "Update failed" });
  }
};

// @desc Delete User (Admin Only)
export const deleteUser = async (req, res) => {
  try {
    await connectDB()
    const id = req.params.id

    const exists = await User.findById(id);
    if (!exists) return res.status(404).json({ message: "User not found" })

    await User.findByIdAndDelete(id);

    return res.json({ message: "User removed successfully" });
  } catch {
    console.error("Delete user error:", err);
    return res.status(500).json({ message: "Delete failed", error: err.message });
  }
};
