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
    default: "",
  },

  images: {
    type: [String],
    required: true,
  },
  primaryImage: {
    type: String, // ✅ The main image for display
  },
  address: {
    street: { type: String, default: ""  },
    city: { type: String, default: ""  },
    state: { type: String, default: ""  },
    zipCode: { type: String, default: ""  },
  },
  features: {
    type: Object,
    default: {},
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
    enum: ["pending", "draft", "approved", "rejected"],
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
  added: { type: String }, // e.g., "2 days ago" (can be computed dynamically)
  listingType: {
    type: String,
    enum: ["sale", "rent"],
    required: true,
  },
  isFeatured: { type: Boolean, default: false },
  isFlagged: { type: Boolean, default: false },
}, { timestamps: true });

const House = mongoose.model("House", houseSchema);

export default House;
