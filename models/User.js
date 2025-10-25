import mongoose from "mongoose";

// Track verification attempts
const verificationAttemptSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  lastAttempt: { type: Date, default: null },
});

// Store verification metadata
const verificationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  score: {
    type: Number,
    default: 0,
  },
  idData: {
    name: { type: String, default: "" },
    idNumber: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    expiryDate: { type: String, default: "" },
    rawText: { type: String, default: "" }, // full OCR text for reference
  },
  livenessPassed: {
    type: Boolean,
    default: false,
  },
  reviewerNote: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },

    // Roles: tenant, landlord, admin
    role: {
      type: String,
      enum: ["landlord", "tenant", "admin"],
      default: "tenant",
    },

    // Profile Info
    location: { type: String, default: "" },
    bio: { type: String, default: "" },
    phone: { type: String, default: "" },
    profilePic: { type: String, default: "" },

    // Account Control
    deleted: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },

    // Verification Data
    verification: verificationSchema,
    verificationAttempts: verificationAttemptSchema,

    // Optional unique face embedding hash
    faceHash: { type: String, index: true },
  },
  { timestamps: true }
);

// Indexing for faster search
userSchema.index({ email: 1 });
userSchema.index({ "verification.status": 1 });
userSchema.index({ faceHash: 1 });

const User = mongoose.model("User", userSchema);
export default User;
