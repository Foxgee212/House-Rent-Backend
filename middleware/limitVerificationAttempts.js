import User from "../models/User.js";

/**
 * Middleware: limit verification attempts to 3 per user per day
 *
 * Prevents abuse of the /verification/auto endpoint.
 * Automatically resets the count the next day.
 */
export default async function limitVerificationAttempts(req, res, next) {
  try {
    // Ensure user is authenticated first
    if (!req.user || !req.user.id) {
      return res.status(401).json({ msg: "Unauthorized — missing user credentials" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // 🧠 Initialize verificationAttempts if missing (e.g., new users)
    if (!user.verificationAttempts) {
      user.verificationAttempts = { count: 0, lastAttempt: null };
      await user.save();
    }

    const { count, lastAttempt } = user.verificationAttempts;

    const now = new Date();
    const lastAttemptDate = lastAttempt ? new Date(lastAttempt) : null;
    const sameDay =
      lastAttemptDate && lastAttemptDate.toDateString() === now.toDateString();

    // If same day and already hit 3 attempts → block
    if (sameDay && count >= 3) {
      console.warn(
        `🚫 User ${user._id} blocked — too many verification attempts today (${count})`
      );
      return res.status(429).json({
        msg: "⚠️ Too many failed verification attempts today. Please try again tomorrow.",
      });
    }

    // If new day → reset count
    if (!sameDay) {
      user.verificationAttempts.count = 0;
      user.verificationAttempts.lastAttempt = now;
      await user.save();
      console.log(`🔄 Reset daily verification attempts for user ${user._id}`);
    }

    // Pass control to next handler
    next();
  } catch (error) {
    console.error("❌ Verification limit check failed:", error);
    return res.status(500).json({
      msg: "Server error during verification limit check",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
