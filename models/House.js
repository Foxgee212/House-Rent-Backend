import mongoose from "mongoose";

const houseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  images: {
    type: [String],
    required: true,
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  available: {
    type: Boolean,
    default: true,
  },
  negotiable: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  deleted: {
    type: Boolean,
    default: false,
  },

  // 🏠 PROPERTY DETAILS
  rooms: { type: Number, default: 0 },
  baths: { type: Number, default: 0 },
  toilets: { type: Number, default: 0 },
  parking: { type: Number, default: 0 },
  area: { type: Number, default: 0 }, // in sqft or sqm
  period: { type: String }, // e.g., "month" for rent or "year"

  // 📅 OPTIONAL METADATA
  added: { type: String }, // e.g., "2 days ago" (you can compute this dynamically)
  listingType: {
    type: String,
    enum: ["sale", "rent"],
    required: true,
  },
}, { timestamps: true });

const House = mongoose.model("House", houseSchema);
export default House;
