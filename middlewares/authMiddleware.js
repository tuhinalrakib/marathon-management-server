import jwt, { decode } from "jsonwebtoken";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import dotenv from "dotenv";
dotenv.config();

// ✅ Verify JWT (used for backend-issued tokens)
export const verifyJWT = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      // console.log(token)
    } else if (req.cookies?.refreshToken) {
      // refresh token shouldn't be used to access protected routes - prefer Authorization header
      return res.status(401).json({ success: false, message: "Use access token" });
    } else {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // contains { id, role, iat, exp }
    next();
  } catch (error) {
    logger?.error?.(`JWT Auth Error: ${error.message}`);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// ✅ Check user role (Admin, Agent, or Regular User)
export const authorizeRoles = (...roles) => {
  return async (req, res, next) => {
    try {
      // Get user data (from decoded JWT)
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Role '${user.role}' not authorized.`,
        });
      }

      next();
    } catch (error) {
      logger.error(`Authorization Error: ${error.message}`);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
};
