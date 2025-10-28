// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/\S+@\S+\.\S+/, "Please provide a valid email"],
    },

    // password may be absent for OAuth users -> not required
    password: {
      type: String,
      required: function () {
      return !this.googleId && !this.provider;
    },
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },

    role: {
      type: String,
      required: [true, "Role is required"],
      enum: ["user", "seller", "admin"],
      default: "user",
    },

    image: {
      type: String,
      required: [true, "Image is required"],
    },
    
    googleId: {
    type: String,
    default: null,
  },

    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    provider: {
      type: String,
      enum: ["credentials", "google", "github"],
      default: "credentials",
    },
    refreshToken: {
      type: [String],
      default : []
    },
    lastLogin: Date,
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

/**
 * Hash password if modified/created. If password is undefined (OAuth user),
 * skip hashing.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (!this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.virtual("displayName").get(function () {
  return this.name || this.email?.split("@")[0];
});

const User = mongoose.model("User", userSchema);
export default User;
