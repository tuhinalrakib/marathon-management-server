import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ Get all users (Admin only)
router.get("/", verifyJWT,/* authorizeRoles("admin"),*/ getAllUsers);

// ✅ Get user by ID (Admin or same user)
router.get("/:id", verifyJWT, getUserById);

// ✅ Update user profile
router.put("/:id", verifyJWT, updateUser);

// ✅ Delete user (Admin only)
router.delete("/:id",verifyJWT, /*verifyJWT, authorizeRoles("admin"),*/ deleteUser);

export default router;
