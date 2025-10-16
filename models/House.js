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
  image: {
    type: String, // Cloudinary or upload URL
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
}, { timestamps: true });

const House = mongoose.model("House", houseSchema);
export default House;