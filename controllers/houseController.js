// controllers/houseController.js
import House from "../models/House.js";
import mongoose from "mongoose";

// ===============================
// ✅ RENTAL HOUSES
// ===============================

// Create a new rental house (Landlord only)
export const createHouse = async (req, res) => {
  const { title, location, price, description, negotiable, rooms, baths, toilets, parking, period } = req.body;

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
      listingType: "rent",

      // 🏠 NEW FIELDS (for footer icons)
      rooms: Number(rooms) || 0,
      baths: Number(baths) || 0,
      toilets: Number(toilets) || 0,
      parking: Number(parking) || 0,
      period: period || "per year",
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
    const houses = await House.find({ listingType: "rent", deleted: false })
      .populate("landlord", "name email");
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const houses = await House.find({ status: "approved", listingType: "sale" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("landlord", "name email phone profilePic");

    const total = await House.countDocuments({ status: "approved", listingType: "sale" });

    res.status(200).json({
      success: true,
      houses,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("Get approved sales error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Create a new sale house (Landlord only)
export const createSaleHouse = async (req, res) => {
  try {
    console.log("Recieved files:", req.files);
    const { title, location, price, description, negotiable, rooms, baths, toilets, parking } = req.body;

    if (!title || !location || !price || !description) {
      return res.status(400).json({ success: false, msg: "All fields are required" });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return res.status(400).json({ success: false, msg: "Price must be a number" });
    }

    const imageUrls = req.files?.map((file) => file.path) || [];
    if (imageUrls.length === 0) {
      return res.status(400).json({ success: false, msg: "At least one image is required" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const parsedNegotiable = negotiable === "true" || negotiable === true;

    const newHouse = await House.create({
      title,
      location,
      price: parsedPrice,
      description,
      images: imageUrls,
      landlord: req.user.id,
      negotiable: parsedNegotiable,
      status: "pending",
      listingType: "sale",

      // 🏠 NEW FIELDS (for footer icons)
      rooms: Number(rooms) || 0,
      baths: Number(baths) || 0,
      toilets: Number(toilets) || 0,
      parking: Number(parking) || 0,
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
  const { title, location, price, description, negotiable, available, rooms, baths, toilets, parking } = req.body;

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

    // 🏠 NEW FIELDS (for footer icons)
    if (rooms !== undefined) house.rooms = Number(rooms);
    if (baths !== undefined) house.baths = Number(baths);
    if (toilets !== undefined) house.toilets = Number(toilets);
    if (parking !== undefined) house.parking = Number(parking);

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
    const houses = await House.find({
      landlord: req.user.id,
      listingType: "sale",
      deleted: false,
    }).populate("landlord", "name email phone profilePic");
    res.status(200).json({ success: true, houses });
  } catch (err) {
    console.error("Get my sales error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Update a house by ID (Landlord only)
export const updateHouse = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "Invalid house ID" });
  }

  try {
    const house = await House.findById(id);

    if (!house) {
      return res.status(404).json({ success: false, error: "House not found" });
    }

    if (house.landlord.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { title, location, price, description, negotiable, rooms, baths, toilets, parking } = req.body;

    if (title !== undefined) house.title = title;
    if (location !== undefined) house.location = location;
    if (price !== undefined) house.price = price;
    if (description !== undefined) house.description = description;
    if (negotiable !== undefined) house.negotiable = negotiable === "true" || negotiable === true;

    // 🏠 NEW FIELDS (for footer icons)
    if (rooms !== undefined) house.rooms = Number(rooms);
    if (baths !== undefined) house.baths = Number(baths);
    if (toilets !== undefined) house.toilets = Number(toilets);
    if (parking !== undefined) house.parking = Number(parking);

    if (req.files && req.files.length > 0) {
      house.images = req.files.map((file) => file.path);
    }

    await house.save();

    res.status(200).json({ success: true, house });
  } catch (err) {
    console.error("Update house error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Update sale availability (Landlord only)
export const updateSaleAvailability = async (req, res) => {
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
    console.error("Update sale availability error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
