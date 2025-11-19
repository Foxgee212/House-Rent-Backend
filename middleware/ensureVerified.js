// middleware/ensureVerified.js
export default function ensureVerified(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Please log in first." });
    }

    // Only apply to landlords and agents
    if (["landlord", "agent"].includes(req.user.role)) {
      const { verification, firstPropertyPosted, emailVerified } = req.user;

      // ✅ Allow first property upload if email is verified
      if (!firstPropertyPosted && emailVerified) {
        return next();
      }

      // ✅ Require identity verification for all other cases
      if (!verification || verification.status !== "verified") {
        return res.status(403).json({
          error: `Access denied. ${req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)} identity verification required.`,
        });
      }
    }

    // Tenants/buyers and verified landlords/agents
    next();
  } catch (error) {
    console.error("ensureVerified middleware error:", error.message);
    res.status(500).json({ error: "Internal server error in verification check." });
  }
}
