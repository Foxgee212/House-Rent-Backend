// middleware/ensureVerified.js
export default function ensureVerified(req, res, next) {
  try {
    // ✅ Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Please log in first." });
    }

    // ✅ Ensure landlords are verified before accessing restricted routes
    if (req.user.role === "landlord") {
      if (!req.user.verification || req.user.verification.status !== "verified") {
        return res.status(403).json({
          error: "Access denied. Landlord identity verification required.",
        });
      }
    }

    // ✅ Allow other roles or verified landlords
    next();
  } catch (error) {
    console.error("ensureVerified middleware error:", error.message);
    res.status(500).json({ error: "Internal server error in verification check." });
  }
}
