import express from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
// import propertyRoutes from "./propertyRoutes.js";
// import adminRoutes from "./adminRoutes.js";

const router = express.Router();

// ✅ Health check route
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 API is running successfully!",
  });
});

// ✅ Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// router.use("/properties", propertyRoutes);
// router.use("/admin", adminRoutes);

// ✅ Fallback for unknown routes (handled before errorHandler)
// Catch-all unknown routes
router.all(/^(?!\/auth|\/users).*$/, (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

export default router;
