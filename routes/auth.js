import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateOTP, sendOTP } from "../utils/otp.js";

const router = express.Router();

// ===============================
// REGISTER USER
// ===============================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, location = "", bio = "", phone = "" } = req.body;
    if (!name || !email || !password) return res.status(400).json({ msg: "Name, email, and password are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role: role || "tenant", location, bio, phone });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(201).json({
      success: true,
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, location, bio, phone },
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ===============================
// REQUEST LOGIN OTP
// ===============================
router.post("/login/request-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const otpCode = generateOTP();
    user.otp = { code: otpCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000), purpose: "login" };
    await user.save();

    await sendOTP(email, otpCode);
    res.json({ msg: "OTP sent to email" });
  } catch (err) {
    console.error("OTP request error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// VERIFY LOGIN OTP
// ===============================
router.post("/login/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.otp || user.otp.purpose !== "login" || user.otp.code !== otp || user.otp.expiresAt < new Date()) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    // Clear OTP after success
    user.otp = { code: "", expiresAt: null, purpose: "" };
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const { password, ...userData } = user.toObject();
    res.json({ msg: "OTP verified", token, user: userData });
  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// REQUEST FORGOT PASSWORD OTP
// ===============================
router.post("/forgot-password/request-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const otpCode = generateOTP();
    user.otp = { code: otpCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000), purpose: "reset" };
    await user.save();

    await sendOTP(email, otpCode);
    res.json({ msg: "OTP sent to email for password reset" });
  } catch (err) {
    console.error("Forgot password OTP error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// VERIFY FORGOT PASSWORD OTP
// ===============================
router.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.otp || user.otp.purpose !== "reset" || user.otp.code !== otp || user.otp.expiresAt < new Date()) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    if (!newPassword) return res.json({ msg: "OTP verified, provide new password" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = { code: "", expiresAt: null, purpose: "" };
    await user.save();

    res.json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error("Forgot password verify error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
