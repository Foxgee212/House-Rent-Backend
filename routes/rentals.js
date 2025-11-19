import express from "express";
import auth from "../middleware/auth.js";
import ensureVerified from "../middleware/ensureVerified.js";
import upload from "../middleware/upload.js";
import mongoose from "mongoose";
import House from "../models/House.js";
import { createHouseGeneric, updateHouseGeneric, getHouses, updateAvailability } from "../controllers/houseController.js";
import { deleteHouse } from "../controllers/adminController.js";

const router = express.Router();

// ==============================
// RENTAL ROUTES
// ==============================

// 🟢 Create a new rental house (Landlord only)
router.post("/", auth, ensureVerified, upload.array("images", 10), (req, res) => createHouseGeneric(req, res, "rent"));

// 🟢 Get all rental houses (Public)
router.get("/", getHouses);

// 🟢 Get all approved rental houses (Public) with pagination
router.get("/approved", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const total = await House.countDocuments({
      listingType: "rent",
      status: "approved",
      deleted: false,
    });

    const houses = await House.find({
      listingType: "rent",
      status: "approved",
      deleted: false,
    })
      .populate("landlord", "name email phone profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      totalHouses: total,
      houses,
    });
  } catch (err) {
    console.error("Get approved rental houses error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 🟢 Get logged-in landlord's rentals (Private) with pagination
// router.get("/my", auth, ensureVerified, async ...)
router.get("/my", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await House.countDocuments({
      lsandlord: req.user.id,
      listingType: "rent",
      deleted: false,
    });

    const houses = await House.find({
      landlord: req.user.id,
      listingType: "rent",
      deleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      totalHouses: total,
      houses,
    });
  } catch (err) {
    console.error("Get my rentals error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 🟢 Update rental availability (Landlord only)
router.patch("/:id/availability", auth, updateAvailability);

// 🟢 Delete rental (Landlord only)
router.delete("/:id", auth, deleteHouse);

// 🟢 Get single rental house by ID (Public)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "Invalid house ID" });
  }

  try {
    const house = await House.findOne({
      _id: id,
      listingType: "rent",
    }).populate("landlord", "name email phone profilePic");

    if (!house)
      return res.status(404).json({ success: false, error: "Rental not found" });

    res.status(200).json({ success: true, house });
  } catch (err) {
    console.error("Get rental by ID error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 🟢 Update a rental house (Landlord only)
router.put("/:id", auth, ensureVerified, upload.array("images", 10), (req, res) => updateHouseGeneric(req, res, "rent"));

export default router;
