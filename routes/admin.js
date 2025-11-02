import express from "express";
import auth from "../middleware/auth.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import {
  getAllUsers,
  deleteUser,
  getAllHouses,
  approveHouse,
  deleteHouse,
  getDashboardStats,
  getPendingHouses,
  ApprovedHouses,
  getAllVerifications,     // 🆕 added
  getVerificationById,   // 🆕 added
  approveVerification,        // 🆕 added
  rejectVerification          // 🆕 added
} from "../controllers/adminController.js";

const router = express.Router();

/* ==============================
   ✅ ADMIN DASHBOARD ROUTES
   ============================== */

// 📊 Dashboard stats
router.get("/stats", auth, verifyAdmin, getDashboardStats);

/* ==============================
   🏠 HOUSE MANAGEMENT ROUTES
   ============================== */

// 🏘️ Get all houses
router.get("/houses", auth, verifyAdmin, getAllHouses);

// 🕒 Get pending houses
router.get("/pending", auth, verifyAdmin, getPendingHouses);

// ✅ Get approved houses
router.get("/approved", auth, verifyAdmin, ApprovedHouses);

// ✅ Approve a house
router.patch("/houses/:id/approve", auth, verifyAdmin, approveHouse);

// 🗑️ Delete a house
router.delete("/houses/:id", auth, verifyAdmin, deleteHouse);

/* ==============================
   👥 USER MANAGEMENT ROUTES
   ============================== */

// 👨‍💻 Get all users
router.get("/users", auth, verifyAdmin, getAllUsers);

// ❌ Delete a user
router.delete("/users/:id", auth, verifyAdmin, deleteUser);

/* ==============================
   🧾 VERIFICATION MANAGEMENT ROUTES
   ============================== */

// 🔍 Get all pending verifications
router.get("/verifications", auth, verifyAdmin, getAllVerifications);

// 👁️ View single verification details
router.get("/verifications/:id", auth, verifyAdmin, getVerificationById);

// ✅ Approve verification
router.patch("/verifications/:id/approve", auth, verifyAdmin, approveVerification);

// ❌ Reject verification
router.patch("/verifications/:id/reject", auth, verifyAdmin, rejectVerification);

export default router;
