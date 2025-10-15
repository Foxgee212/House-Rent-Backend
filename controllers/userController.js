// controllers/userController.js
import User from "../models/User.js";

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, location, bio } = req.body;
    const profilePicture = req.file ? req.file.path : undefined;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        name,
        phone,
        location,
        bio,
        ...(profilePicture && { profilePicture }),
      },
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
