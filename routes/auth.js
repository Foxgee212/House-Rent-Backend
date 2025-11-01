import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateOTP, sendOTP } from "../utils/otp.js";

const router = express.Router();

/* ============================================================
   🧹 AUTO-CLEANUP: Remove unverified users older than 24 hours
============================================================ */
 export async function cleanupUnverifiedUsers() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
  try {
    const result = await User.deleteMany({
      emailVerified: false,
      createdAt: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Removed ${result.deletedCount} unverified users.`);
    }
  } catch (err) {
    console.error("❌ Cleanup error:", err.message);
  }
}



/* ============================================================
   📍 REGISTER USER (send OTP for email verification)
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP(6);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      location,
      bio,
      phone,
      emailVerificationOTP: otp,
      emailVerificationExpires: Date.now() + 10 * 60 * 1000, // 10 min
      emailVerified: false,
    });

    await sendOTP(email, otp);

    return res.status(201).json({
      success: true,
      msg: "Registration successful. Please check your email for the OTP to verify your account.",
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    return res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 RESEND EMAIL VERIFICATION OTP
============================================================ */
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ msg: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    if (user.emailVerified)
      return res.status(400).json({ msg: "Email already verified. Please log in." });

    const otp = generateOTP(6);
    user.emailVerificationOTP = otp;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    await sendOTP(email, otp);

    return res.status(200).json({
      success: true,
      msg: "A new OTP has been sent to your email.",
    });
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    return res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 VERIFY EMAIL (confirm OTP)
============================================================ */
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ msg: "Email and OTP are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    if (user.emailVerified)
      return res.status(400).json({ msg: "Email already verified." });

    if (user.emailVerificationOTP !== otp || Date.now() > user.emailVerificationExpires)
      return res.status(400).json({ msg: "Invalid or expired OTP. Please request a new one." });

    user.emailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      msg: "✅ Email verified successfully. You can now log in.",
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
    return res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 LOGIN USER (block if email not verified)
============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ msg: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User does not exist." });

    if (!user.emailVerified)
      return res.status(403).json({ msg: "Please verify your email before logging in." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials." });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _, ...userData } = user.toObject();

    return res.status(200).json({
      success: true,
      msg: "Login successful.",
      token,
      user: userData,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 FORGOT PASSWORD (send OTP)
============================================================ */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ msg: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    const otp = generateOTP(6);
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    await sendOTP(email, otp);

    return res.status(200).json({
      success: true,
      msg: "OTP sent to your email for password reset.",
    });
  } catch (err) {
    console.error("❌ Forgot Password error:", err);
    return res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 RESET PASSWORD (using OTP)
============================================================ */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ msg: "Email, OTP, and new password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    if (user.resetPasswordOTP !== otp || Date.now() > user.resetPasswordExpires)
      return res.status(400).json({ msg: "Invalid or expired OTP. Please request a new one." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      msg: "Password reset successful. You can now log in.",
    });
  } catch (err) {
    console.error("❌ Reset Password error:", err);
    return res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 GET CURRENT USER (via JWT)
============================================================ */
router.get("/me", async (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "-password -emailVerificationOTP -emailVerificationExpires -resetPasswordOTP -resetPasswordExpires"
    );

    if (!user) return res.status(404).json({ msg: "User not found." });

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("❌ Auth error:", err);
    return res.status(401).json({ msg: "Invalid token.", error: err.message });
  }
});

export default router;
