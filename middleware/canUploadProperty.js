import User from "../models/User.js";

export const canUploadProperty = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ msg: "User not found." });

    // First property is allowed without full verification
    if (!user.firstPropertyPosted) return next();

    // Subsequent properties require verification
    if (user.verification?.status !== "verified") {
      return res.status(403).json({
        msg: "Please complete identity verification to upload more properties.",
      });
    }

    next();
  } catch (err) {
    console.error("❌ Upload check error:", err);
    return res.status(500).json({ msg: "Server error." });
  }
};
