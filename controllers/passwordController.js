import crypto from "crypto";
import Token from "../models/Token.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js"
import asyncHandler from "express-async-handler"


// Request password reset
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await Token.create({
    userId: user._id,
    token,
    type: "passwordReset",
    expiresAt,
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?uid=${user._id}&token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Password Reset Request",
    html: `<p>Hi ${user.name},</p>
           <p>Click the link below to reset your password:</p>
           <a href="${resetUrl}" target="_blank">Verify Email</a>
           <p>This link expires in 1 hour.</p>`,
  });

  return res.json({ message: "Password reset email sent" });
});

// Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const { uid, token, newPassword } = req.body;
  if (!uid || !token || !newPassword) return res.status(400).json({ message: "Invalid request" });

  const storedToken = await Token.findOne({
    userId: uid,
    token,
    type: "passwordReset",
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    if (storedToken) await storedToken.deleteOne();
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const user = await User.findById(uid);
  user.password = newPassword; // Model will hash password pre-save
  await user.save();
  await storedToken.deleteOne();

  return res.json({ message: "Password reset successfully. You can now login." });
});
