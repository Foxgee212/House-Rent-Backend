// controllers/houseController.js
import House from "../models/House.js";
import mongoose from "mongoose";

// ===============================
// ✅ Helper Functions
// ===============================
const validateRequiredFields = (fields) => {
  for (const [key, value] of Object.entries(fields)) {
    if (!value) return `${key} is required`;
  }
  return null;
};

const handleError = (res, err, msg = "Server error") => {
  console.error(msg, err);
  return res.status(500).json({ success: false, error: msg });
};

const successResponse = (res, msg, data = {}, status = 200) => {
  return res.status(status).json({ success: true, msg, ...data });
};

const processHouseImages = (house, files, primaryImageIndex) => {
  if (files?.length) house.images.push(...files.map((file) => file.path));

  if (primaryImageIndex !== undefined) {
    const index = Number(primaryImageIndex);
    if (index >= 0 && index < house.images.length) house.primaryImage = house.images[index];
  } else if (!house.primaryImage && house.images.length) {
    house.primaryImage = house.images[0];
  }
};

const updateHouseFields = (house, body) => {
  const { title, location, price, description, negotiable, rooms, baths, toilets, parking, available } = body;

  if (title !== undefined) house.title = title;
  if (location !== undefined) house.location = location;
  if (price !== undefined) house.price = price;
  if (description !== undefined) house.description = description;
  if (negotiable !== undefined) house.negotiable = negotiable === "true" || negotiable === true;
  if (rooms !== undefined) house.rooms = Number(rooms);
  if (baths !== undefined) house.baths = Number(baths);
  if (toilets !== undefined) house.toilets = Number(toilets);
  if (parking !== undefined) house.parking = Number(parking);
  if (available !== undefined) house.available = available;
};

// ===============================
// ✅ CREATE HOUSE (rental or sale)
// ===============================
export const createHouseGeneric = async (req, res, listingType) => {
  const { title, location, price, description, negotiable, rooms, baths, toilets, parking, period, primaryImageIndex } = req.body;

  const errorMsg = validateRequiredFields({ title, location, price, description });
  if (errorMsg) return res.status(400).json({ success: false, msg: errorMsg });

  try {
        const user = req.user; // Assuming auth middleware already attaches user

    // ===============================
    // ✅ Check upload permission
    // ===============================
    if (!user.firstPropertyPosted && user.emailVerified) {
      // First property allowed
    } else if (user.firstPropertyPosted && user.verification?.status !== "verified") {
      return res.status(403).json({
        success: false,
        msg: "You must complete identity verification to upload more properties.",
      });
    }

    const imageUrls = req.files?.map((file) => file.path) || [];
    if (!imageUrls.length) return res.status(400).json({ success: false, msg: "At least one image is required" });

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) return res.status(400).json({ success: false, msg: "Price must be a number" });

    const index = Number(primaryImageIndex);
    const primaryImage = (index >= 0 && index < imageUrls.length) ? imageUrls[index] : imageUrls[0];

    const newHouse = await House.create({
      title,
      location,
      price: parsedPrice,
      description,
      images: imageUrls,
      primaryImage,
      landlord: req.user.id,
      negotiable: negotiable === "true" || negotiable === true,
      status: "pending",
      listingType,
      rooms: Number(rooms) || 0,
      baths: Number(baths) || 0,
      toilets: Number(toilets) || 0,
      parking: Number(parking) || 0,
      period: listingType === "rent" ? period || "per year" : undefined,
    });

    
    // ===============================
    // ✅ Update user flags
    // ===============================
    if (!user.firstPropertyPosted) user.firstPropertyPosted = true;
    user.propertiesPostedCount += 1;
    await user.save();

    return successResponse(res, `${listingType === "rent" ? "Rental" : "Sale"} house created successfully`, { house: newHouse }, 201);
  } catch (err) {
    return handleError(res, err, `Create ${listingType} house error`);
  }
};

// ===============================
// ✅ UPDATE HOUSE (rental or sale)
// ===============================
export const updateHouseGeneric = async (req, res, listingType) => {
  const { id } = req.params;
  const { primaryImageIndex } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, error: "Invalid house ID" });

  try {
    const house = await House.findById(id);
    if (!house) return res.status(404).json({ success: false, error: "House not found" });
    if (house.landlord.toString() !== req.user.id) return res.status(403).json({ success: false, error: "Not authorized" });

    updateHouseFields(house, req.body);

// Handle image updates
const keptImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : house.images;

// Replace old image array with the kept ones
house.images = Array.isArray(keptImages) ? keptImages : [];

// Add newly uploaded images (if any)
if (req.files?.length) {
  const newImages = req.files.map((file) => file.path);
  house.images.push(...newImages);
}

// Handle primary image logic
if (req.body.primaryImageIndex !== undefined) {
  const index = Number(req.body.primaryImageIndex);
  if (index >= 0 && index < house.images.length) {
    house.primaryImage = house.images[index];
  }
} else if (!house.primaryImage && house.images.length) {
  house.primaryImage = house.images[0];
}


    await house.save();
    return successResponse(res, `${listingType === "rent" ? "Rental" : "Sale"} house updated successfully`, { house });
  } catch (err) {
    return handleError(res, err, `Update ${listingType} house error`);
  }
};

// ===============================
// ✅ GET HOUSES
// ===============================
export const getHouses = async (req, res) => {
  try {
    const houses = await House.find({ listingType: "rent", deleted: false }).populate("landlord", "name email");
    res.status(200).json({ success: true, houses });
  } catch (err) {
    return handleError(res, err, "Get houses error");
  }
};

export const getHouseById = async (req, res) => {
  try {
    const house = await House.findById(req.params.id).populate("landlord", "name email");
    if (!house) return res.status(404).json({ success: false, msg: "House not found" });
    res.status(200).json({ success: true, house });
  } catch (err) {
    return handleError(res, err, "Get house by ID error");
  }
};

// ===============================
// ✅ UPDATE AVAILABILITY
// ===============================
export const updateAvailability = async (req, res) => {
  const { id } = req.params;
  const { available } = req.body;

  try {
    const house = await House.findById(id);
    if (!house) return res.status(404).json({ success: false, msg: "House not found" });
    if (house.landlord.toString() !== req.user.id) return res.status(403).json({ success: false, msg: "Unauthorized" });

    house.available = available;
    await house.save();

    res.status(200).json({
      success: true,
      msg: `House marked as ${available ? "available" : "occupied"}`,
      house,
    });
  } catch (err) {
    return handleError(res, err, "Update availability error");
  }
};

// ===============================
// ✅ SALES SPECIFIC
// ===============================
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

    return res.status(200).json({
      success: true,
      houses,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    return handleError(res, err, "Get approved sales error");
  }
};

export const getMySales = async (req, res) => {
  try {
    const houses = await House.find({ landlord: req.user.id, listingType: "sale", deleted: false })
      .populate("landlord", "name email phone profilePic");
    return res.status(200).json({ success: true, houses });
  } catch (err) {
    return handleError(res, err, "Get my sales error");
  }
};

export const updateSaleAvailability = updateAvailability;

// ===============================
// ✅ Wrappers for Listing Types
// ===============================

// SALE Listings
export const createSaleHouse = (req, res) => createHouseGeneric(req, res, "sale");
export const updateSaleHouse = (req, res) => updateHouseGeneric(req, res, "sale");

// RENT Listings (optional if you have rent routes)
export const createRentHouse = (req, res) => createHouseGeneric(req, res, "rent");
export const updateRentHouse = (req, res) => updateHouseGeneric(req, res, "rent");

