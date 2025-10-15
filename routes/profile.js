import express from "express";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js"; // ✅ Cloudinary upload middleware

const router = express.Router();

/**
 * @route   GET /api/profile
 * @desc    Get the logged-in user's profile
 * @access  Private
 */
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * @route   PUT /api/profile
 * @desc    Update user profile info and/or picture
 * @access  Private
 */
router.put("/", auth, upload.single("profilePic"), async (req, res) => {
  try {
    const { name, email, phone, location, bio } = req.body;
    const updates = {};

    // ✅ Only include fields that are provided
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (location) updates.location = location;
    if (bio) updates.bio = bio;

    // ✅ Cloudinary URL (middleware adds req.file.path)
    if (req.file) {
      updates.profilePic = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.json({
      success: true,
      msg: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
