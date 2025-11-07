// routes/houses.js
import express from "express";
import auth from "../middleware/auth.js";
import ensureVerified from "../middleware/ensureVerified.js"; 
import upload from "../middleware/upload.js";
import House from "../models/House.js";
import mongoose from "mongoose";

import {
  createHouse,
  getHouses,
  getHouseById,
  updateAvailability,
  getApprovedSales,
  createSaleHouse,
  updateSaleHouse,
  getMySales,
} from "../controllers/houseController.js";
import { deleteHouse } from "../controllers/adminController.js";

const router = express.Router();

// ==============================
// RENTAL ROUTES
// ==============================

// Create a new rental house (Landlord only, verified)
router.post("/", auth, ensureVerified, upload.array("images", 5), createHouse);

// Get all rental houses (Public)
router.get("/", getHouses);

// Get all approved rental houses (Public)
router.get("/approved", async (req, res) => {
  try {
    const houses = await House.find({ status: "approved" }).populate(
      "landlord",
      "name email phone profilePic"
    );
    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get approved houses error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Get logged-in landlord's own rentals (Private)
router.get("/my", auth, ensureVerified, async (req, res) => {
  try {
    const houses = await House.find({ landlord: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get my houses error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Update rental house availability (Landlord only, verified)
router.patch("/:id/availability", auth, ensureVerified, updateAvailability);

// Delete a rental house (Landlord only, verified)
router.delete("/:id", auth, ensureVerified, deleteHouse);

// ==============================
// SALES ROUTES
// ==============================

// Get all approved houses for sale (Public)
router.get("/approved-sales", getApprovedSales);

// Create a new house for sale (Landlord or Agent, verified)
router.post("/sales", auth, ensureVerified, upload.array("images", 5), createSaleHouse);

// Update a house for sale (Landlord or Agent, verified)
router.put("/sales/:id", auth, ensureVerified, upload.array("images", 5), updateSaleHouse);

// Get logged-in user's own sales (Private)
router.get("/my-sales", auth, ensureVerified, getMySales);

// ==============================
// PARAMETERIZED ROUTE (Get single house by ID)
// Must be last to avoid conflicts with above routes
// ==============================
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "Invalid house ID" });
  }

  try {
    const house = await House.findById(id).populate("landlord", "name email phone profilePic");
    if (!house) return res.status(404).json({ success: false, error: "House not found" });

    res.status(200).json({ success: true, house });
  } catch (err) {
    console.error("Get house by ID error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
