// controllers/authController.js
import User from "../models/User.js";
import connectDB from "../config/db.js";
import Token from "../models/Token.js"
import crypto from "crypto";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { sendEmail } from "../utils/sendEmail.js"
import dotenv from "dotenv";
dotenv.config();

/*=========== Helpers using HMAC secrets================ */
const createAccessToken = (user) => {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET missing");
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "1h" }
  );
};

const createRefreshToken = (user) => {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET missing");
  // keep minimal payload
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * Save refresh token in Redis with TTL (ms)
 * key: `refresh:<token>` -> userId
 */
const storeRefreshToken = async (token, userId, ttlSeconds = 7 * 24 * 60 * 60) => {
  // store token => userId
  const user = await User.findById(userId)
  if (!user) throw new Error("User not found");

  user.refreshToken.push(token)
  await user.save()
};

const removeRefreshToken = async (token) => {
  await User.updateOne(
    { refreshToken : token},
    { $pull : { refreshToken : token}}
  )
};

/**
 * @route POST /api/auth/register
 */

/*======================Regsiter Account==============================*/
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, image, role } = req.body;
  console.log(name, email, password, image, role)

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }
  await connectDB()
  
  // basic normalization
  const normalizedEmail = String(email).toLowerCase().trim();
  console.log(email)

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) return res.status(409).json({ message: "Email already exists" });

  const user = await User.create({
    name,
    email: normalizedEmail,
    password, // model pre-save will hash
    image: image,
    role: role,
    provider: "credentials",
  });

  // Generate email verification token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

  await Token.create({
    userId: user._id,
    token,
    type: "emailVerification",
    expiresAt,
  });

  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?uid=${user._id}&token=${token}`

  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    html: `<p>Hi ${user.name},</p>
           <p>Click the link below to verify your email:</p>
            <a href="${verificationUrl}" target="_blank">Verify Email</a>
           <p>This link expires in 24 hours.</p>`,
  });

  // // Create tokens
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  // // Store refresh token in Redis
  await storeRefreshToken(refreshToken, user._id.toString());

  // // cookie settings
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };


  // // Set cookie
  res.cookie("refreshToken", refreshToken, cookieOptions);


  // hide sensitive fields in response
  const safeUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
  };

    return res.status(201).json({ message: "User registered! Verification email", user: safeUser, accessToken });
});

/**
 * @route POST /api/auth/login
 */
/**==================Login================================================ */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");
  // if (!user) return res.status(401).json({ message: "Invalid credentials" });

  // Check Email Verified or not
  if(!user.isVerified){
    return res.status(401).json({ message: "Email verification did not complete yet." })
  }

  // check account lock
  if (user.lockUntil && user.lockUntil > Date.now()) {
    return res.status(423).json({ message: "Account locked. Try later or reset password." });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    // increment loginAttempts (simple)
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    // lock account after 5 failed tries for 30 minutes
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 30 * 60 * 1000;
      user.loginAttempts = 0;
    }
    await user.save();
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // reset attempt counters on successful login
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  await storeRefreshToken(refreshToken, user._id.toString());

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  res.cookie("refreshToken", refreshToken, cookieOptions);

  return res.json({
    message: "Logged in",
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      isVerified: user.isVerified,
    },
  });
});

const isValidRefreshToken = async (token) => {
  const user = await User.findOne({ refreshToken: token });
  return user ? user._id.toString() : null;
};


/**
 * @route GET /api/auth/refresh
 * Read refresh token from cookie, verify, check Redis, issue new access token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  // verify JWT first
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    // invalid token
    await removeRefreshToken(token).catch(() => { });
    return res.status(403).json({ message: "Invalid refresh token" });
  }

  // check Redis mapping
  const storedUserId = await isValidRefreshToken(token)
  if (!storedUserId || storedUserId !== payload.id) {
    // token not found or mismatched -> possible revoke
    await removeRefreshToken(token).catch(() => { });
    return res.status(403).json({ message: "Refresh token revoked" });
  }

  // issue new access token (do not rotate refresh token here; can rotate if desired)
  const user = await User.findById(payload.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const accessToken = createAccessToken(user);
  return res.json({ accessToken });
});


/**
 * @route POST /api/auth/logout
 */
export const logoutUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await removeRefreshToken(token).catch(() => { });
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    path: "/",
  });

  return res.json({ message: "Logged out" });
});


/* ===================== OAuth exchange: called by frontend AuthBridge ===================== */
/**
 * POST /auth/oauth/exchange
 * Body: { email, name, image, providerId, deviceInfo }
 * Sets HttpOnly refresh cookie and returns accessToken + user
 */
export const oauthExchange = asyncHandler(async (req, res) => {
  const { email, name, image, providerId } = req.body;
  if (!email) return res.status(400).json({ message: "Missing email" });

  await connectDB();
  let user = await User.findOne({ email: String(email).toLowerCase().trim() });

  if (!user) {
    user = await User.create({
      name,
      email: String(email).toLowerCase().trim(),
      image,
      googleId: providerId,
      provider: "google",
      role: "user",
      isVerified: true
    });
  } else {
    // update provider fields if missing
    if (!user.googleId && providerId) user.googleId = providerId;
    if (!user.image && image) user.image = image;
    await user.save();
  }

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  await storeRefreshToken(refreshToken, user._id.toString());

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
  // console.log(accessToken)
  res.cookie("refreshToken", refreshToken, cookieOptions);

  return res.json({
    message: "OAuth exchange successful",
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image || user.avatar,
    },
  });
});