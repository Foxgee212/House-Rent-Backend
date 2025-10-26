import mongoose from "mongoose";

// ===============================
// Subschema: Verification Attempts
// ===============================
const verificationAttemptSchema = new mongoose.Schema({
  count: {
    type: Number,
    default: 0,
    min: [0, "Attempt count cannot be negative"],
  },
  lastAttempt: {
    type: Date,
    default: null,
  },
});

// ===============================
// Subschema: Verification Metadata
// ===============================
const verificationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  idData: {
    name: { type: String, default: "" },
    idNumber: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    expiryDate: { type: String, default: "" },
    rawText: { type: String, default: "" }, // OCR text
  },
  faceMatchDistance: {
    type: Number,
    default: 0,
  },
  idImageUrl: {
    type: String,
    default: "",
  },
  selfieUrl: {
    type: String,
    default: "",
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

// ===============================
// Main User Schema
// ===============================
const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },

    // Roles
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

    // Account State
    deleted: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },

    // Verification Data
    verification: verificationSchema,
    verificationAttempts: verificationAttemptSchema,

    // Optional unique face embedding hash (for deduplication)
    faceHash: { type: String, index: true },
  },
  { timestamps: true }
);

// ===============================
// Indexes
// ===============================
userSchema.index({ email: 1 });
userSchema.index({ "verification.status": 1 });
userSchema.index({ faceHash: 1 });

// ===============================
// Virtuals & Utilities (Optional Enhancements)
// ===============================

// Reset daily verification attempts
userSchema.methods.resetVerificationAttempts = async function () {
  this.verificationAttempts.count = 0;
  this.verificationAttempts.lastAttempt = new Date();
  await this.save();
};

// Quick summary for admin panels
userSchema.virtual("verificationSummary").get(function () {
  return {
    status: this.verification?.status || "pending",
    score: this.verification?.score || 0,
    idNumber: this.verification?.idData?.idNumber || "N/A",
    attempts: this.verificationAttempts?.count || 0,
    verified: this.verified,
  };
});

const User = mongoose.model("User", userSchema);
export default User;
