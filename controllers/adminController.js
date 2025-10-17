import User from "../models/User.js";
import House from "../models/House.js";

// 👥 Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ Delete user
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🏘️ Get all houses
export const getAllHouses = async (req, res) => {
  try {
    const houses = await House.find().populate("landlordId", "email name");
    res.json(houses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ⏳ Pending houses
export const getPendingHouses = async (req, res) => {
  try {
    const pending = await House.find({ status: "pending" }).populate("landlordId", "email name");
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Approve house
export const approveHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
    res.json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🚫 Reject house
export const deleteHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(req.params.id, { status: "rejected" }, { new: true });
    res.json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
