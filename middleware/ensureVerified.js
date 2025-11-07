// middleware/ensureVerified.js
export default function ensureVerified(req, res, next) {
  try {
    // ✅ Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Please log in first." });
    }

    // ✅ Ensure landlords and agents are verified before accessing restricted routes
    if (["landlord", "agent"].includes(req.user.role)) {
      if (!req.user.verification || req.user.verification.status !== "verified") {
        return res.status(403).json({
          error: `Access denied. ${req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)} identity verification required.`,
        });
      }
    }

    // ✅ Allow tenants/buyers and verified landlords/agents
    next();
  } catch (error) {
    console.error("ensureVerified middleware error:", error.message);
    res.status(500).json({ error: "Internal server error in verification check." });
  }
}
