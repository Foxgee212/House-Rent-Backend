import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import House from "../models/House.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import {
  getAllUsers,
  deleteUser,
  getAllHouses,
  approveHouse,
  deleteHouse
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/users", auth, verifyAdmin, getAllUsers);
router.delete("/users/:id", auth, verifyAdmin, deleteUser);

router.get("/houses", auth, verifyAdmin, getAllHouses);
router.patch("/houses/:id/approve", auth, verifyAdmin, approveHouse);
router.delete("/houses/:id", auth, verifyAdmin, deleteHouse);

// ✅ Admin dashboard stats
router.get("/stats", auth, async (req, res) => {
  try {
    if(req.user.role !== "admin")
        return res.status(403).json({ message: "Access denied"})
    const totalHouses = await House.countDocuments();
    const approved = await House.countDocuments({ status: "approved" });
    const pending = await House.countDocuments({ status: "pending" });
    const totalUsers = await User.countDocuments();

    res.json({
      totalHouses,
      approved,
      pending,
      totalUsers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

export default router;
