import User from "../models/User.js";

/* ============================================================
   🧹 AUTO-CLEANUP: Remove unverified users older than 24 hours
============================================================ */
 export async function cleanupUnverifiedUsers() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
  try {
    const result = await User.deleteMany({
      emailVerified: false,
      createdAt: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Removed ${result.deletedCount} unverified users.`);
    }
  } catch (err) {
    console.error("❌ Cleanup error:", err.message);
  }
}

