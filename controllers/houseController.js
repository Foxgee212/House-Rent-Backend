// controllers/houseController.js
import House from "../models/House.js";

// Create a new house (Landlord only)
export const createHouse = async (req, res) => {
  const { title, location, price, description, image } = req.body;

  if (!title || !location || !price || !description) {
    return res.status(400).json({ success: false, msg: "All fields are required" });
  }

  try {
    const newHouse = await House.create({
      title,
      location,
      price,
      description,
      image: req.file?.path || image || null, // support file upload
      landlord: req.user.id,
      status: "pending"
    });

    res.status(201).json({
      success: true,
      msg: "House created successfully",
      house: newHouse,
    });
  } catch (err) {
    console.error("Create house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Get all houses (public)
export const getHouses = async (req, res) => {
  try {
    const houses = await House.find().populate("landlord", "name email");
    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get houses error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Get house by ID (public)
export const getHouseById = async (req, res) => {
  try {
    const house = await House.findById(req.params.id).populate("landlord", "name email");
    if (!house) return res.status(404).json({ success: false, msg: "House not found" });
    res.status(200).json({ success: true, house });
  } catch (err) {
    console.error("Get house by ID error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Update house availability (Landlord only)
export const updateAvailability = async (req, res) => {
  const { id } = req.params;
  const { available } = req.body;

  try {
    const house = await House.findById(id);
    if (!house) return res.status(404).json({ success: false, msg: "House not found" });

    // Ensure only landlord can update
    if (house.landlord.toString() !== req.user.id) {
      return res.status(403).json({ success: false, msg: "Unauthorized" });
    }

    house.available = available;
    await house.save();

    res.status(200).json({
      success: true,
      msg: `House marked as ${available ? "available" : "occupied"}`,
      house,
    });
  } catch (err) {
    console.error("Update availability error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
