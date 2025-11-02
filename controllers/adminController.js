import User from "../models/User.js";
import House from "../models/House.js";

/* ==============================
   👥 USER MANAGEMENT
   ============================== */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return res.status(500).json({ message: "Server error fetching users" });
  }
};

// ✅ Delete a user
export const deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    return res.status(500).json({ message: "Server error deleting user" });
  }
};

/* ==============================
   🏘️ HOUSE MANAGEMENT
   ============================== */
export const getAllHouses = async (req, res) => {
  try {
    const houses = await House.find()
      .populate("landlord", "name email phone profilePic")
      .sort({ createdAt: -1 });
    return res.status(200).json(houses);
  } catch (error) {
    console.error("❌ Error fetching houses:", error);
    return res.status(500).json({ message: "Server error fetching houses" });
  }
};

export const getPendingHouses = async (req, res) => {
  try {
    const pending = await House.find({ status: "pending" }).populate(
      "landlord",
      "name email"
    );
    return res.status(200).json(pending);
  } catch (error) {
    console.error("❌ Error fetching pending houses:", error);
    return res.status(500).json({ message: "Server error fetching pending houses" });
  }
};

// ✅ Approved Houses
export const ApprovedHouses = async (req, res) => {
  try {
    const approved = await House.find({ status: "approved" }).populate(
      "landlord",
      "name email phone profilePic"
    );
    return res.status(200).json(approved);
  } catch (error) {
    res.status(500).json({ msg: "Error fetching Houses" });
  }
};

// ✅ Approve / Reject / Delete
export const approveHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!house) return res.status(404).json({ message: "House not found" });
    return res.status(200).json({
      success: true,
      message: "House approved successfully",
      data: house,
    });
  } catch (error) {
    console.error("❌ Error approving house:", error);
    return res.status(500).json({ message: "Server error approving house" });
  }
};

export const rejectHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!house) return res.status(404).json({ message: "House not found" });
    return res.status(200).json({
      success: true,
      message: "House rejected successfully",
      data: house,
    });
  } catch (error) {
    console.error("❌ Error rejecting house:", error);
    return res.status(500).json({ message: "Server error rejecting house" });
  }
};

export const deleteHouse = async (req, res) => {
  try {
    const deleted = await House.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "House not found" });
    return res.status(200).json({ message: "House permanently deleted" });
  } catch (error) {
    console.error("❌ Error deleting house:", error);
    return res.status(500).json({ message: "Server error deleting house" });
  }
};

/* ==============================
   📊 DASHBOARD STATS
   ============================== */
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalHouses,
      pendingHouses,
      approvedHouses,
      totalVerifications,
      pendingVerifications,
      verifiedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      House.countDocuments(),
      House.countDocuments({ status: "pending" }),
      House.countDocuments({ status: "approved" }),
      User.countDocuments({ "verification.status": { $exists: true } }),
      User.countDocuments({ "verification.status": "pending" }),
      User.countDocuments({ "verification.status": "verified" }),
    ]);

    return res.status(200).json({
      totalUsers,
      totalHouses,
      pendingHouses,
      approvedHouses,
      totalVerifications,
      pendingVerifications,
      verifiedUsers,
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    return res.status(500).json({ message: "Server error fetching stats" });
  }
};

/* ==============================
   ✅ VERIFICATION MANAGEMENT
   ============================== */

// 📋 Get all landlords with verification data
export const getAllVerifications = async (req, res) => {
  try {
    const users = await User.find({
      role: "landlord",
      verification: { $exists: true },
    })
      .select("name email phone verification")
      .sort({ createdAt: -1 });

    if (!users.length) return res.status(200).json([]);

    res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error fetching verifications:", error);
    res.status(500).json({ msg: "Unable to fetch verifications" });
  }
};

// 👁️ Get details for one landlord verification
export const getVerificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select(
      "name email phone verification"
    );

    if (!user) return res.status(404).json({ msg: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error fetching verification details:", error);
    res.status(500).json({ msg: "Unable to fetch verification details" });
  }
};

// ✅ Approve verification
export const approveVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ msg: "User not found" });

    user.verification.status = "verified";
    await user.save();

    res.json({ msg: "Verification approved successfully" });
  } catch (error) {
    console.error("❌ Error approving verification:", error);
    res.status(500).json({ msg: "Unable to approve verification" });
  }
};

// ❌ Reject verification
export const rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ msg: "User not found" });

    user.verification.status = "failed";
    user.verification.idData = null; // optional: clear uploaded docs
    await user.save();

    res.json({ msg: "Verification rejected successfully" });
  } catch (error) {
    console.error("❌ Error rejecting verification:", error);
    res.status(500).json({ msg: "Unable to reject verification" });
  }
};
