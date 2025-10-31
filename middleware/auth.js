import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * ✅ Authentication Middleware
 * ----------------------------
 * Verifies JWT token and attaches user info (excluding password) to req.user.
 * Protects private routes and ensures the user still exists in the database.
 */
const auth = async (req, res, next) => {
  try {
    // ✅ Get Authorization header
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        msg: "Authorization header missing",
      });
    }

    // ✅ Extract Bearer token
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Access denied. No token provided.",
      });
    }

    // ✅ Verify token signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Find user and ensure they are not deleted
    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.deleted) {
      return res.status(404).json({
        success: false,
        msg: "User not found or deleted.",
      });
    }

    // ✅ Ensure email has been verified (optional strict rule)
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        msg: "Email not verified. Please verify your email to continue.",
      });
    }

    // ✅ Attach user to request object for downstream routes
    req.user = user;

    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);

    const message =
      err.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid or expired token.";

    return res.status(401).json({
      success: false,
      msg: message,
    });
  }
};

export default auth;
