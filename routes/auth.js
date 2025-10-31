import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateOTP, sendOTP } from "../utils/otp.js";

const router = express.Router();

/* ============================================================
   📍 REGISTER USER (with OTP email verification)
============================================================ */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "tenant", location = "", bio = "", phone = "" } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ msg: "Name, email, and password are required." });

    const allowedRoles = ["tenant", "landlord", "admin"];
    if (!allowedRoles.includes(role))
      return res.status(400).json({ msg: "Invalid user role." });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ msg: "User already exists." });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP for verification
    const otp = generateOTP(6);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      location,
      bio,
      phone,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // expires in 10 min
      isVerified: false,
    });

    await newUser.save();

    // Send OTP email
    await sendOTP(email, otp);

    res.status(201).json({
      success: true,
      msg: "Registration successful. Please check your email for the OTP to verify your account.",
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 VERIFY EMAIL WITH OTP
============================================================ */
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ msg: "Email and OTP are required." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ msg: "User not found." });

    if (user.isVerified)
      return res.status(400).json({ msg: "Email already verified." });

    if (user.otp !== otp)
      return res.status(400).json({ msg: "Invalid OTP." });

    if (Date.now() > user.otpExpires)
      return res.status(400).json({ msg: "OTP expired. Please register again." });

    // Mark user as verified
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      msg: "Email verified successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Verify Email error:", err);
    res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 LOGIN USER
============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ msg: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials." });


    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password: _, ...userData } = user.toObject();
    res.status(200).json({
      success: true,
      msg: "Login successful.",
      token,
      user: userData,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 FORGOT PASSWORD (Send OTP)
============================================================ */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    const otp = generateOTP(6);
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry
    await user.save();

    await sendOTP(email, otp);

    res.status(200).json({
      success: true,
      msg: "OTP sent to your email for password reset.",
      otp,
    });
  } catch (err) {
    console.error("❌ Forgot Password error:", err);
    res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 RESET PASSWORD (Using OTP)
============================================================ */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ msg: "Email, OTP, and new password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    if (user.otp !== otp)
      return res.status(400).json({ msg: "Invalid OTP." });

    if (Date.now() > user.otpExpires)
      return res.status(400).json({ msg: "OTP expired. Request a new one." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      msg: "Password reset successful. You can now log in.",
    });
  } catch (err) {
    console.error("❌ Reset Password error:", err);
    res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 GET CURRENT USER
============================================================ */
router.get("/me", async (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ msg: "User not found." });

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("❌ Auth error:", err);
    res.status(401).json({ msg: "Invalid token.", error: err.message });
  }
});

export default router;
