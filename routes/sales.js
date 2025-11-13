import express from "express";
import auth from "../middleware/auth.js";
import ensureVerified from "../middleware/ensureVerified.js";
import upload from "../middleware/upload.js";
import mongoose from "mongoose";
import House from "../models/House.js";
import {
  createSaleHouse,
  updateSaleHouse,
  getApprovedSales,
  getMySales,
  updateSaleAvailability,
} from "../controllers/houseController.js";

const router = express.Router();

// ==============================
// SALES ROUTES
// ==============================

// 🟢 Create a new sale listing (Landlord/Agent)
router.post("/", auth, ensureVerified, upload.array("images", 5), (req, res) =>
  createSaleHouse(req, res)
);

// 🟢 Update a sale listing (Landlord/Agent)
router.put("/:id", auth, ensureVerified, upload.array("images", 5), (req, res) =>
  updateSaleHouse(req, res)
);

// 🟢 Get all approved sale listings (Public) with pagination
router.get("/approved", (req, res) => getApprovedSales(req, res));

// 🟢 Get logged-in user's sale listings (Private) with pagination
router.get("/my", auth, ensureVerified, (req, res) => getMySales(req, res));

// 🟢 Update sale availability (Landlord only)
router.patch("/:id/availability", auth, ensureVerified, (req, res) =>
  updateSaleAvailability(req, res)
);

// 🟢 Get single sale house by ID (Public)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "Invalid house ID" });
  }

  try {
    const house = await House.findOne({
      _id: id,
      listingType: "sale",
    }).populate("landlord", "name email phone profilePic");

    if (!house)
      return res.status(404).json({ success: false, error: "Sale listing not found" });

    res.status(200).json({ success: true, house });
  } catch (err) {
    console.error("Get sale by ID error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
