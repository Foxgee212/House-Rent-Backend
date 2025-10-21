import express from "express";
import auth from "../middleware/auth.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import {
  getAllUsers,
  deleteUser,
  getAllHouses,
  approveHouse,
  deleteHouse,
  getDashboardStats,  // ✅ Use the controller version instead of inline code
  getPendingHouses,
  ApprovedHouses,
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

// Pending users
router.get("/pending", auth, verifyAdmin, getPendingHouses )

//approved houses
router.get("/approved", auth, verifyAdmin, ApprovedHouses)
export default router;
