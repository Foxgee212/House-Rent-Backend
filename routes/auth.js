import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateOTP, sendOTP } from "../utils/otp.js";

const router = express.Router();

/* ============================================================
   📍 REGISTER USER (send OTP for email verification)
============================================================ */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "tenant", location = "", bio = "", phone = "" } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ msg: "Name, email, and password are required." });

    const allowedRoles = ["tenant", "landlord", "agent", "admin"];
    if (!allowedRoles.includes(role))
      return res.status(400).json({ msg: "Invalid user role." });

    const verifiedUser = await User.findOne({ email, emailVerified: true });
    if (verifiedUser) return res.status(400).json({ msg: "User already exists." });

    let user = await User.findOne({ email, emailVerified: false });
    const otp = generateOTP(6);
    const otpExpires = Date.now() + 10 * 60 * 1000;

    if (user) {
      user.name = name;
      user.password = await bcrypt.hash(password, 10);
      user.role = role;
      user.location = location;
      user.bio = bio;
      user.phone = phone;
      user.emailVerificationOTP = otp;
      user.emailVerificationExpires = otpExpires;

      await user.save();            // Save before sending OTP
      await sendOTP(email, otp, "Email Verification OTP");

      return res.status(200).json({
        success: true,
        msg: "An OTP has been resent to your email. Please verify to complete registration.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      location,
      bio,
      phone,
      emailVerificationOTP: otp,
      emailVerificationExpires: otpExpires,
      emailVerified: false,
    });

    await sendOTP(email, otp, "Email Verification OTP");

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
    const { email, context } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    const otp = generateOTP(6);
    const otpExpires = Date.now() + 10 * 60 * 1000;

    if (context === "forgot") {
      user.resetPasswordOTP = otp;
      user.resetPasswordExpires = otpExpires;
      user.resetPasswordVerified = false;

      await user.save();
      await sendOTP(email, otp, "Password Reset OTP");

      return res.status(200).json({
        success: true,
        msg: "📩 A new password reset OTP has been sent to your email.",
      });
    }

    if (user.emailVerified)
      return res.status(400).json({ msg: "Email already verified. Please log in." });

    user.emailVerificationOTP = otp;
    user.emailVerificationExpires = otpExpires;

    await user.save();
    await sendOTP(email, otp, "Email Verification OTP");

    return res.status(200).json({
      success: true,
      msg: "📩 A new verification OTP has been sent to your email.",
    });
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    return res.status(500).json({ msg: "Server error.", error: err.message });
  }
});

/* ============================================================
   📍 VERIFY OTP (signup or forgot password)
============================================================ */
router.post("/verify-otp", async (req, res) => {
  try {
    console.log("🟢 Verify OTP Request Body:", req.body);
    const { email, otp, context } = req.body;
    if (!email || !otp)
      return res.status(400).json({ msg: "Email and OTP are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    if (context === "forgot") {
      if (user.resetPasswordOTP !== otp || Date.now() > user.resetPasswordExpires)
        return res.status(400).json({ msg: "Invalid or expired OTP." });

      user.resetPasswordVerified = true;
      await user.save(); // OTP will be cleared after password reset

      return res.status(200).json({
        success: true,
        msg: "OTP verified successfully. You can now reset your password.",
      });
    }

    if (user.emailVerified)
      return res.status(400).json({ msg: "Email already verified." });

    if (user.emailVerificationOTP !== otp || Date.now() > user.emailVerificationExpires)
      return res.status(400).json({ msg: "Invalid or expired OTP." });

    user.emailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

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
    console.error("❌ Verify OTP error:", err);
    return res.status(500).json({ msg: "Server error.", error: err.message });
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
    if (!user) return res.status(400).json({ msg: "User does not exist." });

    if (!user.emailVerified)
      return res.status(403).json({ msg: "Please verify your email before logging in." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials." });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

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
    if (!email) return res.status(400).json({ msg: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    const otp = generateOTP(6);
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    user.resetPasswordVerified = false;

    await user.save();
    await sendOTP(email, otp, "Password Reset OTP");

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
   📍 RESET PASSWORD (after verified OTP)
============================================================ */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res.status(400).json({ msg: "Email and new password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    if (!user.resetPasswordVerified)
      return res.status(400).json({ msg: "Please verify your OTP before resetting your password." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    user.resetPasswordVerified = false;
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
   📍 GET CURRENT USER
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
