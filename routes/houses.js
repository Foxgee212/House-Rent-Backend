// routes/houses.js
import express from "express";
import House from "../models/House.js";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

/**
 * @route   POST /api/houses
 * @desc    Add new house (Landlord only)
 * @access  Private
 */
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    // Only landlords can add houses
    if (req.user.role !== "landlord") {
      return res.status(403).json({ msg: "Only landlords can add houses" });
    }

    const { title, location, price, description } = req.body;

    // Validate input
    if (!title || !location || !price || !description) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({ msg: "House image is required" });
    }

    // Create house
    const newHouse = new House({
      title,
      location,
      price,
      description,
      image: req.file.path, // Make sure this is a valid URL/path
      landlord: req.user.id,
    });

    const savedHouse = await newHouse.save();

    res.status(201).json({
      success: true,
      msg: "House added successfully",
      house: savedHouse,
    });
  } catch (err) {
    console.error("Add house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * @route   GET /api/houses
 * @desc    Get all houses
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const houses = await House.find().populate("landlord", "name email");
    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get houses error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * @route   GET /api/houses/:id
 * @desc    Get single house by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const house = await House.findById(req.params.id).populate(
      "landlord",
      "name email"
    );

    if (!house) return res.status(404).json({ msg: "House not found" });

    res.status(200).json({ success: true, house });
  } catch (err) {
    console.error("Get single house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * @route   DELETE /api/houses/:id
 * @desc    Delete house (Landlord only)
 * @access  Private
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ msg: "House not found" });

    if (house.landlord.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    await house.deleteOne();

    res.status(200).json({ success: true, msg: "House deleted successfully" });
  } catch (err) {
    console.error("Delete house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
