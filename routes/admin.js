import express from "express";
import auth from "../middleware/auth.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import {
  // 👥 User management
  getAllUsers,
  deleteUser,

  // 🏘️ House management
  getAllHouses,
  getPendingRentHouses,
  getPendingSaleHouses,
  getApprovedRentHouses,
  getApprovedSaleHouses,
  approveHouse,
  deleteHouse,

  // 📊 Dashboard
  getDashboardStats,

  // 🧾 Verification management
  getAllVerifications,
  getVerificationById,
  approveVerification,
  rejectVerification,
} from "../controllers/adminController.js";

const router = express.Router();

/* ==============================
   📊 ADMIN DASHBOARD
============================== */

// Dashboard stats
router.get("/stats", auth, verifyAdmin, getDashboardStats);

/* ==============================
   🏘️ HOUSE MANAGEMENT
============================== */

// 🏠 All houses
router.get("/houses", auth, verifyAdmin, getAllHouses);

// ⏳ Pending Houses (Separated by listingType)
router.get("/houses/rent/pending", auth, verifyAdmin, getPendingRentHouses);
router.get("/houses/sale/pending", auth, verifyAdmin, getPendingSaleHouses);

// ✅ Approved Houses (Separated by listingType)
router.get("/houses/rent/approved", auth, verifyAdmin, getApprovedRentHouses);
router.get("/houses/sale/approved", auth, verifyAdmin, getApprovedSaleHouses);

// 🟢 Approve a house
router.patch("/houses/:id/approve", auth, verifyAdmin, approveHouse);

// 🗑️ Delete a house
router.delete("/houses/:id", auth, verifyAdmin, deleteHouse);

/* ==============================
   👥 USER MANAGEMENT
============================== */

// 👨‍💻 All users
router.get("/users", auth, verifyAdmin, getAllUsers);

// ❌ Delete user
router.delete("/users/:id", auth, verifyAdmin, deleteUser);

/* ==============================
   ✅ VERIFICATION MANAGEMENT
============================== */

// 🔍 All verifications
router.get("/verifications", auth, verifyAdmin, getAllVerifications);

// 👁️ Single verification details
router.get("/verifications/:id", auth, verifyAdmin, getVerificationById);

// ✅ Approve verification
router.patch("/verifications/:id/approve", auth, verifyAdmin, approveVerification);

// ❌ Reject verification
router.patch("/verifications/:id/reject", auth, verifyAdmin, rejectVerification);

export default router;
