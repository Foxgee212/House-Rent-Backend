// routes/houses.js
import express from "express";
import auth from "../middleware/auth.js";
import ensureVerified from "../middleware/ensureVerified.js"; 
import upload from "../middleware/upload.js";
import mongoose from "mongoose";

import {
  // RENTALS
  createHouse,
  getHouses,
  updateAvailability,

  // SALES
  getApprovedSales,
  createSaleHouse,
  updateSaleHouse,
  getMySales,
  updateSaleAvailability,

  // SHARED
  getHouseById,
} from "../controllers/houseController.js";

import { deleteHouse } from "../controllers/adminController.js";

const router = express.Router();


// ==============================
// 🏠 RENTAL ROUTES
// ==============================

// Create rental listing
router.post(
  "/rentals",
  auth,
  ensureVerified,
  upload.array("images", 5),
  createHouse
);

// Get all rentals (public)
router.get("/rentals", getHouses);

// Get approved rentals (public)
router.get("/rentals/approved", async (req, res) => {
  try {
    const houses = await House.find({
      listingType: "rent",
      status: "approved",
      deleted: false,
    }).populate("landlord", "name email phone profilePic");

    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get approved rentals error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Get logged-in landlord’s own rentals
router.get("/rentals/my", auth, ensureVerified, async (req, res) => {
  try {
    const houses = await House.find({
      landlord: req.user.id,
      listingType: "rent",
      deleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get my rentals error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Update rental availability
router.patch(
  "/rentals/:id/availability",
  auth,
  ensureVerified,
  updateAvailability
);

// Delete rental listing
router.delete("/rentals/:id", auth, ensureVerified, deleteHouse);


// ==============================
// 💰 SALES ROUTES
// ==============================

// Create a sale listing
router.post(
  "/sales",
  auth,
  ensureVerified,
  upload.array("images", 5),
  createSaleHouse
);

// Update sale listing
router.put(
  "/sales/:id",
  auth,
  ensureVerified,
  upload.array("images", 5),
  updateSaleHouse
);

// Get approved sale listings
router.get("/sales/approved", getApprovedSales);

// Get logged-in agent’s own sales
router.get("/sales/my", auth, ensureVerified, getMySales);

// Update rental availability
router.patch(
  "/sales/:id/availability",
  auth,
  ensureVerified,
  updateSaleAvailability
);


// ==============================
// 🔍 SHARED — Get single listing by ID
// ==============================
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "Invalid house ID" });
  }

  try {
    const house = await House.findById(id)
      .populate("landlord", "name email phone profilePic");

    if (!house)
      return res.status(404).json({ success: false, error: "House not found" });

    res.status(200).json({ success: true, house });
  } catch (err) {
    console.error("Get house by ID error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
