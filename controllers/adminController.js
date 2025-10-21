import User from "../models/User.js";
import House from "../models/House.js";

/* ==============================
   👥 USER MANAGEMENT
   ============================== */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 }); // ✅ sort handled by Mongoose

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
    return res
      .status(500)
      .json({ message: "Server error deleting user" });
  }
};

/* ==============================
   🏘️ HOUSE MANAGEMENT
   ============================== */

// ✅ Get all houses (with landlord details)
export const getAllHouses = async (req, res) => {
  try {
    const houses = await House.find()
      .populate("landlord", "name email")
      .sort({ createdAt: -1});
    return res.status(200).json(houses);
  } catch (error) {
    console.error("❌ Error fetching houses:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching houses" });
  }
};

// ✅ Get only pending houses
export const getPendingHouses = async (req, res) => {
  try {
    const pending = await House.find({ status: "pending" }).populate(
      "landlord",
      "name email"
    );
    return res.status(200).json(pending);
  } catch (error) {
    console.error("❌ Error fetching pending houses:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching pending houses" });
  }
};

// Approved Houses 
export const ApprovedHouses = async (req, res) => {
  try {
    const approved = await House.find({ status: "approved"}).populate( "landlord", "name email");
    return res.status(200).json(approved)

  } catch (error) {
    res.status(500).json({msg: "Error fetching Houses"})
  }
}

// ✅ Approve a house
export const approveHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );

    if (!house) {
      return res.status(404).json({ message: "House not found" });
    }

    return res.status(200).json({
      success: true,
      message: "House approved successfully",
      idata: house,
    });
  } catch (error) {
    console.error("❌ Error approving house:", error);
    return res
      .status(500)
      .json({ message: "Server error approving house" });
  }
};

// ✅ Reject a house
export const rejectHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );

    if (!house) {
      return res.status(404).json({ message: "House not found" });
    }

    return res.status(200).json({
      success: true,
      message: "House rejected successfully",
      data: houses,
    });
  } catch (error) {
    console.error("❌ Error rejecting house:", error);
    return res
      .status(500)
      .json({ message: "Server error rejecting house" });
  }
};

// ✅ Permanently delete a house
export const deleteHouse = async (req, res) => {
  try {
    const deleted = await House.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "House not found" });
    }
    return res.status(200).json({ message: "House permanently deleted" });
  } catch (error) {
    console.error("❌ Error deleting house:", error);
    return res
      .status(500)
      .json({ message: "Server error deleting house" });
  }
};

/* ==============================
   📊 DASHBOARD STATS
   ============================== */
export const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalHouses, pendingHouses, approvedHouses] =
      await Promise.all([
        User.countDocuments(),
        House.countDocuments(),
        House.countDocuments({ status: "pending"}),
        House.countDocuments({ status: "approved" }),
      ]);

    return res.status(200).json({
      totalUsers,
      totalHouses,
      pendingHouses,
      approvedHouses,
    });
    console.log(await House.find({}, "status deleted"));
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching stats" });
  }
};
