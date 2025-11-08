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

  // 🆕 NEW FIELD
  listingType: {
    type: String,
    enum: ["sale", "rent"],
    required: true,
  },
}, { timestamps: true });


const House = mongoose.model("House", houseSchema);
export default House;