import jwt from "jsonwebtoken";
import User from "../models/User.js"; // ✅ add ".js" extension if using ES modules

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to req.user
 */
const auth = async (req, res, next) => {
  try {
    // ✅ Get token from header
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, msg: "Authorization header missing" });
    }

    // ✅ Extract Bearer token
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, msg: "No token provided" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Fetch user details from DB (optional but recommended)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, msg: "User not found or deleted" });
    }

    // ✅ Attach user info to request object
    req.user = user;

    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return res
      .status(401)
      .json({ success: false, msg: "Invalid or expired token" });
  }
};

export default auth;
