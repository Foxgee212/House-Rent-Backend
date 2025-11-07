// controllers/houseController.js
import House from "../models/House.js";

// ===============================
// ✅ RENTAL HOUSES
// ===============================

// Create a new rental house (Landlord only)
export const createHouse = async (req, res) => {
  const { title, location, price, description, negotiable } = req.body;

  if (!title || !location || !price || !description) {
    return res.status(400).json({ success: false, msg: "All fields are required" });
  }

  try {
    const imageUrls = req.files?.map((file) => file.path) || [];
    if (!imageUrls.length) {
      return res.status(400).json({ success: false, msg: "At least one image is required" });
    }

    const parsedNegotiable = negotiable === "true" || negotiable === true;

    const newHouse = await House.create({
      title,
      location,
      price,
      description,
      images: imageUrls,
      landlord: req.user.id,
      negotiable: parsedNegotiable,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      msg: "Rental house created successfully",
      house: newHouse,
    });
  } catch (err) {
    console.error("Create rental house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Get all rental houses (public)
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
    if (!house)
      return res.status(404).json({ success: false, msg: "House not found" });
    res.status(200).json({ success: true, house });
  } catch (err) {
    console.error("Get house by ID error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Update rental house availability (Landlord only)
export const updateAvailability = async (req, res) => {
  const { id } = req.params;
  const { available } = req.body;

  try {
    const house = await House.findById(id);
    if (!house) return res.status(404).json({ success: false, msg: "House not found" });

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

// ===============================
// ✅ SALES HOUSES
// ===============================

// Get all approved houses for sale (public)
export const getApprovedSales = async (req, res) => {
  try {
    const houses = await House.find({ status: "approved" }).populate("landlord", "name email");
    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get approved sales error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Create a new sale house (Landlord only)
export const createSaleHouse = async (req, res) => {
  const { title, location, price, description, negotiable } = req.body;

  if (!title || !location || !price || !description) {
    return res.status(400).json({ success: false, msg: "All fields are required" });
  }

  try {
    const imageUrls = req.files?.map((file) => file.path) || [];
    if (!imageUrls.length) {
      return res.status(400).json({ success: false, msg: "At least one image is required" });
    }

    const parsedNegotiable = negotiable === "true" || negotiable === true;

    const newHouse = await House.create({
      title,
      location,
      price,
      description,
      images: imageUrls,
      landlord: req.user.id,
      negotiable: parsedNegotiable,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      msg: "House listed for sale successfully",
      house: newHouse,
    });
  } catch (err) {
    console.error("Create sale house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Update a sale house (Landlord only)
export const updateSaleHouse = async (req, res) => {
  const { id } = req.params;
  const { title, location, price, description, negotiable, available } = req.body;

  try {
    const house = await House.findById(id);
    if (!house) return res.status(404).json({ success: false, msg: "House not found" });

    if (house.landlord.toString() !== req.user.id) {
      return res.status(403).json({ success: false, msg: "Unauthorized" });
    }

    if (title) house.title = title;
    if (location) house.location = location;
    if (price) house.price = price;
    if (description) house.description = description;
    if (negotiable !== undefined) house.negotiable = negotiable === "true" || negotiable === true;
    if (available !== undefined) house.available = available;
    if (req.files?.length) house.images = req.files.map((f) => f.path);

    await house.save();
    res.status(200).json({ success: true, msg: "Sale house updated", house });
  } catch (err) {
    console.error("Update sale house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Get logged-in landlord's own sales
export const getMySales = async (req, res) => {
  try {
    const houses = await House.find({ landlord: req.user.id }).populate("landlord", "name email");
    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get my sales error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
