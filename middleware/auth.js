import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        msg: "Authorization header missing",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.deleted) {
      return res.status(404).json({
        success: false,
        msg: "User not found or deleted.",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);

    return res.status(401).json({
      success: false,
      msg:
        err.name === "TokenExpiredError"
          ? "Token has expired. Please log in again."
          : "Invalid or expired token.",
    });
  }
};

export default auth;
