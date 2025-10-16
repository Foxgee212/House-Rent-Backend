// routes/houses.js
import express from "express";
import House from "../models/House.js";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { updateAvailability } from "../controllers/houseController.js";
const router = express.Router();

/**
 * @route   POST /api/houses
 * @desc    Add new house (Landlord only)
 * @access  Private
 */
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const house = new House({
      title: req.body.title,
      location: req.body.location,
      price: req.body.price,
      description: req.body.description,
      image: req.file?.path || req.body.image || null,
      landlord: req.user.id,
    });

    const savedHouse = await house.save();

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
 * @desc    Get all houses (public)
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
 * @route   GET /api/houses/my
 * @desc    Get houses of logged-in landlord
 * @access  Private
 *
 * NOTE: placed before "/:id" to avoid route clash ("/my" being treated as an :id)
 */
router.get("/my", auth, async (req, res) => {
  try {
    const houses = await House.find({ landlord: req.user.id }).sort({ createdAt: -1 });
    // Return consistent shape (object with houses array) so frontend can handle both shapes safely
    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get my houses error:", err);
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
    const house = await House.findById(req.params.id).populate("landlord", "name email");
    if (!house) return res.status(404).json({ success: false, msg: "House not found" });
    res.status(200).json({ success: true, house });
  } catch (err) {
    console.error("Get single house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * @route   PUT /api/houses/:id
 * @desc    Update house details (Landlord only)
 * @access  Private
 */
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ success: false, msg: "House not found" });

    if (house.landlord.toString() !== req.user.id) {
      return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    const { title, location, price, description } = req.body;

    // Keep the same validation behaviour you had
    if (!title || !location || !price || !description) {
      return res.status(400).json({ success: false, msg: "All fields are required" });
    }

    if (req.file) house.image = req.file.path;
    house.title = title;
    house.location = location;
    house.price = price;
    house.description = description;

    const updatedHouse = await house.save();

    res.status(200).json({
      success: true,
      msg: "House updated successfully",
      house: updatedHouse,
    });
  } catch (err) {
    console.error("Update house error:", err);
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
    if (!house) return res.status(404).json({ success: false, msg: "House not found" });

    if (house.landlord.toString() !== req.user.id) {
      return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    await house.deleteOne();
    res.status(200).json({ success: true, msg: "House deleted successfully" });
  } catch (err) {
    console.error("Delete house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.patch("/:id/availability", auth, updateAvailability)

export default router;
