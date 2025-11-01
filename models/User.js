import mongoose from "mongoose";

/* ============================================================
   🔹 SUBSCHEMAS
============================================================ */

// Track how many verification attempts a user made
const verificationAttemptSchema = new mongoose.Schema({
  count: {
    type: Number,
    default: 0,
    min: [0, "Attempt count cannot be negative"],
  },
  lastAttempt: { type: Date, default: null },
});

// Store all identity verification data (OCR, liveness, etc.)
const verificationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  score: { type: Number, default: 0, min: 0, max: 100 },
  idData: {
    name: { type: String, default: "" },
    idNumber: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    expiryDate: { type: String, default: "" },
    rawText: { type: String, default: "" }, // OCR extracted text
  },
  faceMatchDistance: { type: Number, default: 0 },
  idImageUrl: { type: String, default: "" },
  selfieUrl: { type: String, default: "" },
  livenessPassed: { type: Boolean, default: false },
  reviewerNote: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

/* ============================================================
   👤 USER SCHEMA
============================================================ */
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
      enum: ["tenant", "landlord", "admin"],
      default: "tenant",
    },

    // Profile Info
    location: { type: String, default: "" },
    bio: { type: String, default: "" },
    phone: { type: String, default: "" },
    profilePic: { type: String, default: "" },

    // Account States
    deleted: { type: Boolean, default: false },
    verified: { type: Boolean, default: false }, // For ID verification
    emailVerified: { type: Boolean, default: false }, // For email OTP verification

    // Verification Data
    verification: verificationSchema,
    verificationAttempts: verificationAttemptSchema,

    // Face embedding hash (optional for deduplication)
    faceHash: { type: String, index: true },

    /* ============================================================
       🔐 PASSWORD RESET & EMAIL OTP FIELDS
    ============================================================ */
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date },
    emailVerificationOTP: { type: String },
    emailVerificationExpires: { type: Date },
  },
  { timestamps: true }
);

/* ============================================================
   ⚙️ INDEXES
============================================================ */
userSchema.index({ email: 1 });
userSchema.index({ "verification.status": 1 });
userSchema.index({ faceHash: 1 });

/* ============================================================
   🧠 VIRTUALS & METHODS
============================================================ */

// Reset daily verification attempts
userSchema.methods.resetVerificationAttempts = async function () {
  this.verificationAttempts.count = 0;
  this.verificationAttempts.lastAttempt = new Date();
  await this.save();
};

// Admin summary virtual
userSchema.virtual("verificationSummary").get(function () {
  return {
    status: this.verification?.status || "pending",
    score: this.verification?.score || 0,
    idNumber: this.verification?.idData?.idNumber || "N/A",
    attempts: this.verificationAttempts?.count || 0,
    verified: this.verified,
    emailVerified: this.emailVerified,
  };
});

/* ============================================================
   🧹 AUTO CLEANUP FUNCTION (Exported separately)
============================================================ */
export async function cleanupUnverifiedUsers() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
  try {
    const result = await User.deleteMany({
      emailVerified: false,
      createdAt: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Auto-cleaned ${result.deletedCount} unverified user(s).`);
    }
  } catch (err) {
    console.error("❌ Error during unverified user cleanup:", err.message);
  }
}

/* ============================================================
   ✅ MODEL REGISTRATION
============================================================ */
const User = mongoose.model("User", userSchema);
export default User;

/* ============================================================
   🚀 SAFE CLEANUP SCHEDULER (starts only after MongoDB connects)
============================================================ */
if (mongoose.connection.readyState === 1) {
  // Mongo is already connected
  cleanupUnverifiedUsers();
  setInterval(cleanupUnverifiedUsers, 6 * 60 * 60 * 1000);
} else {
  // Wait for connection event
  mongoose.connection.once("connected", () => {
    console.log("🕓 Connected to MongoDB — starting unverified user cleanup loop");
    cleanupUnverifiedUsers();
    setInterval(cleanupUnverifiedUsers, 6 * 60 * 60 * 1000);
  });
}
