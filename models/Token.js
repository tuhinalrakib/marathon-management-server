// models/Token.js
import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    token: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["emailVerification", "passwordReset"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const Token = mongoose.models.Token || mongoose.model("Token", tokenSchema);
export default Token;
