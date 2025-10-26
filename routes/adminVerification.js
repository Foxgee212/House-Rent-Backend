// routes/adminVerification.js
import express from "express";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import User from "../models/User.js";

const router = express.Router();

// Fetch all verifications
router.get("/verifications", verifyAdmin, async (req, res) => {
  const users = await User.find({
    "verification.status": { $exists: true },
  }).select("name email verification");
  res.json(users);
});

// Approve / Reject manually
router.post("/verifications/:id/:action", verifyAdmin, async (req, res) => {
  const { id, action } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ msg: "User not found" });

  if (action === "approve") {
    user.verified = true;
    user.verification.status = "verified";
  } else if (action === "reject") {
    user.verified = false;
    user.verification.status = "failed";
  }
  await user.save();

  res.json({ msg: `Verification ${action}d successfully` });
});

export default router;
