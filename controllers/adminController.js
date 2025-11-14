import User from "../models/User.js";
import House from "../models/House.js";

/* ============================================================
   👥 USER MANAGEMENT
============================================================ */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({ message: "Server error deleting user" });
  }
};
export const userslandlords = async (req, res) => {
  try {
    const landlords = await User.find({ role: "landlord" }).select("-password").sort({ createdAt: -1 });
    res.status(200).json(landlords);
  } catch (error) {
    console.error("❌ Error fetching landlords:", error);
    res.status(500).json({ message: "Server error fetching landlords" });
  }
};

export const userstenants = async (req, res) => {
  try {
    const tenants = await User.find({ role: "tenant" }).select("-password").sort({ createdAt: -1 });
    res.status(200).json(tenants);
  } catch (error) { 
    console.error("❌ Error fetching tenants:", error);
    res.status(500).json({ message: "Server error fetching tenants" });
  }
};

export const agentsusers = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" }).select("-password").sort({ createdAt: -1 });
    res.status(200).json(agents);
  } catch (error) {
    console.error("❌ Error fetching agents:", error);
    res.status(500).json({ message: "Server error fetching agents" });
  }
};

/* ============================================================
   🏘️ HOUSE MANAGEMENT
============================================================ */

// ✅ Helper function to fetch houses by status + listingType
const fetchHousesByType = async (status, listingType) => {
  const query = {};
  if (status) query.status = status;
  if (listingType) query.listingType = listingType;

  return await House.find(query)
    .populate("landlord", "name email phone profilePic")
    .sort({ createdAt: -1 });
};

// 📋 Get all houses
export const getAllHouses = async (req, res) => {
  try {
    const houses = await fetchHousesByType();
    res.status(200).json(houses);
  } catch (error) {
    console.error("❌ Error fetching houses:", error);
    res.status(500).json({ message: "Server error fetching houses" });
  }
};

// ⏳ Get all pending rent houses
export const getPendingRentHouses = async (req, res) => {
  try {
    const houses = await fetchHousesByType("pending", "rent");
    res.status(200).json(houses);
  } catch (error) {
    console.error("❌ Error fetching pending rent houses:", error);
    res.status(500).json({ message: "Server error fetching pending rent houses" });
  }
};

// ⏳ Get all pending sale houses
export const getPendingSaleHouses = async (req, res) => {
  try {
    const houses = await fetchHousesByType("pending", "sale");
    res.status(200).json(houses);
  } catch (error) {
    console.error("❌ Error fetching pending sale houses:", error);
    res.status(500).json({ message: "Server error fetching pending sale houses" });
  }
};

// ✅ Get approved rent houses
export const getApprovedRentHouses = async (req, res) => {
  try {
    const houses = await fetchHousesByType("approved", "rent");
    res.status(200).json(houses);
  } catch (error) {
    console.error("❌ Error fetching approved rent houses:", error);
    res.status(500).json({ message: "Server error fetching approved rent houses" });
  }
};

// ✅ Get approved sale houses
export const getApprovedSaleHouses = async (req, res) => {
  try {
    const houses = await fetchHousesByType("approved", "sale");
    res.status(200).json(houses);
  } catch (error) {
    console.error("❌ Error fetching approved sale houses:", error);
    res.status(500).json({ message: "Server error fetching approved sale houses" });
  }
};

// 🟢 Approve a house
export const approveHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!house) return res.status(404).json({ message: "House not found" });

    res.status(200).json({
      success: true,
      message: "House approved successfully",
      data: house,
    });
  } catch (error) {
    console.error("❌ Error approving house:", error);
    res.status(500).json({ message: "Server error approving house" });
  }
};

// 🔴 Reject a house
export const rejectHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!house) return res.status(404).json({ message: "House not found" });

    res.status(200).json({
      success: true,
      message: "House rejected successfully",
      data: house,
    });
  } catch (error) {
    console.error("❌ Error rejecting house:", error);
    res.status(500).json({ message: "Server error rejecting house" });
  }
};

// 🗑️ Delete a house
export const deleteHouse = async (req, res) => {
  try {
    const deleted = await House.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "House not found" });
    res.status(200).json({ message: "House permanently deleted" });
  } catch (error) {
    console.error("❌ Error deleting house:", error);
    res.status(500).json({ message: "Server error deleting house" });
  }
};

/* ============================================================
   📊 DASHBOARD STATS
============================================================ */
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

    res.status(200).json({
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
    res.status(500).json({ message: "Server error fetching stats" });
  }
};

/* ============================================================
   ✅ VERIFICATION MANAGEMENT
============================================================ */
export const getAllVerifications = async (req, res) => {
  try {
    const users = await User.find({ verification: { $exists: true } })
      .select("name email phone role verification")
      .sort({ createdAt: -1 });
    res.status(200).json(users || []);
  } catch (error) {
    console.error("❌ Error fetching verifications:", error);
    res.status(500).json({ message: "Unable to fetch verifications" });
  }
};

export const getVerificationById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name email phone role verification"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error fetching verification details:", error);
    res.status(500).json({ message: "Unable to fetch verification details" });
  }
};

export const approveVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.verification.status = "verified";
    await user.save();

    res.status(200).json({ message: "Verification approved successfully" });
  } catch (error) {
    console.error("❌ Error approving verification:", error);
    res.status(500).json({ message: "Unable to approve verification" });
  }
};

export const rejectVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.verification.status = "rejected";
    user.verification.idData = null;
    await user.save();

    res.status(200).json({ message: "Verification rejected successfully" });
  } catch (error) {
    console.error("❌ Error rejecting verification:", error);
    res.status(500).json({ message: "Unable to reject verification" });
  }
};
