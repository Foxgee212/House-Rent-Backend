// routes/houses.js
import express from "express";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  createHouse,
  getHouses,
  getHouseById,
  updateAvailability,
} from "../controllers/houseController.js";
import House from "../models/House.js";
import { deleteHouse } from "../controllers/adminController.js"

const router = express.Router();

// -------------------- Routes --------------------

// @route   POST /api/houses
// @desc    Add new house (Landlord only)
// @access  Private
router.post("/", auth, upload.array("images", 5), createHouse);

// @route   GET /api/houses
// @desc    Get all houses (Public)
// @access  Public
router.get("/", getHouses);

// @route   GET /api/houses/approved
// @desc    Get all approved houses (Public)
// @access  Public
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

// @route   GET /api/houses/my
// @desc    Get houses of logged-in landlord
// @access  Private
router.get("/my", auth, async (req, res) => {
  try {
    const houses = await House.find({ landlord: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get my houses error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// @route   GET /api/houses/:id
// @desc    Get single house by ID (Public)
// @access  Public
router.get("/:id", getHouseById);

// @route   PATCH /api/houses/:id/availability
// @desc    Update house availability (Landlord only)
// @access  Private
router.patch("/:id/availability", auth, updateAvailability);

//@route Delete/api/houses/:id
//@desc  Delete houses from the landlord dashboard
//@access landlord

router.delete("/:id", auth, deleteHouse)




export default router;
