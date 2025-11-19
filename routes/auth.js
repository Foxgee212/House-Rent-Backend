import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateOTP, sendOTP } from "../utils/otp.js";

const router = express.Router();

/* ============================================================
   🔐 HELPERS
============================================================ */
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const cleanUser = (user) => {
  const obj = user.toObject();
  delete obj.password;
  delete obj.emailVerificationOTP;
  delete obj.emailVerificationExpires;
  delete obj.resetPasswordOTP;
  delete obj.resetPasswordExpires;
  return obj;
};

/* ============================================================
   📍 REGISTER USER
============================================================ */
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "tenant",
      location = "",
      bio = "",
      phone = "",
    } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ msg: "Name, email, and password are required." });

    const allowedRoles = ["tenant", "landlord", "agent", "admin"];
    if (!allowedRoles.includes(role))
      return res.status(400).json({ msg: "Invalid user role." });

    // If email already verified → block registration
    const existingVerified = await User.findOne({ email, emailVerified: true });
    if (existingVerified)
      return res.status(400).json({ msg: "User already exists." });

    // Prepare new OTP
    const otp = generateOTP(6);
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Check unverified user (resend OTP flow)
    let user = await User.findOne({ email, emailVerified: false });

    if (user) {
      user.name = name;
      user.password = await bcrypt.hash(password, 10);
      user.role = role;
      user.location = location;
      user.bio = bio;
      user.phone = phone;
      user.emailVerificationOTP = otp;
      user.emailVerificationExpires = otpExpires;

      await user.save();
      await sendOTP(email, otp, "Email Verification OTP");

      return res.status(200).json({
        success: true,
        msg: "Verification OTP resent. Please verify your email.",
      });
    }

    // Create fresh user
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
      msg: "Registration successful. Please verify your email.",
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    return res.status(500).json({ msg: "Server error." });
  }
});

/* ============================================================
   📍 RESEND OTP
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
        msg: "Password reset OTP sent.",
      });
    }

    if (user.emailVerified)
      return res.status(400).json({ msg: "Email already verified." });

    user.emailVerificationOTP = otp;
    user.emailVerificationExpires = otpExpires;
    await user.save();

    await sendOTP(email, otp, "Email Verification OTP");

    return res.status(200).json({
      success: true,
      msg: "Verification OTP sent.",
    });
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    return res.status(500).json({ msg: "Server error." });
  }
});

/* ============================================================
   📍 VERIFY OTP
============================================================ */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, context } = req.body;

    if (!email || !otp)
      return res.status(400).json({ msg: "Email and OTP are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    // Forgot password OTP
    if (context === "forgot") {
      if (
        user.resetPasswordOTP !== otp ||
        Date.now() > user.resetPasswordExpires
      )
        return res.status(400).json({ msg: "Invalid or expired OTP." });

      user.resetPasswordVerified = true;
      await user.save();

      return res.status(200).json({
        success: true,
        msg: "OTP verified. You can now reset your password.",
      });
    }

    // Email verification OTP
    if (user.emailVerified)
      return res.status(400).json({ msg: "Email already verified." });

    if (
      user.emailVerificationOTP !== otp ||
      Date.now() > user.emailVerificationExpires
    )
      return res.status(400).json({ msg: "Invalid or expired OTP." });

    // ✅ Mark email as verified
    user.emailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;

    // ✅ Allow first property upload
    // firstPropertyPosted=false means first upload allowed
    if (user.firstPropertyPosted === undefined) user.firstPropertyPosted = false;

    await user.save();

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      msg: "Email verified successfully.",
      token,
      user: {
        ...cleanUser(user),
        canUploadFirstProperty: !user.firstPropertyPosted, // frontend flag
      },
    });
  } catch (err) {
    console.error("❌ Verify OTP error:", err);
    return res.status(500).json({ msg: "Server error." });
  }
});

/* ============================================================
   📍 LOGIN USER
============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ msg: "Email and password required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found." });

    if (!user.emailVerified)
      return res
        .status(403)
        .json({ msg: "Please verify your email before logging in." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Invalid credentials." });

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      msg: "Login successful.",
      token,
      user: cleanUser(user),
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ msg: "Server error." });
  }
});

/* ============================================================
   📍 FORGOT PASSWORD → SEND OTP
============================================================ */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ msg: "Email required." });

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
      msg: "Password reset OTP sent.",
    });
  } catch (err) {
    console.error("❌ Forgot Password error:", err);
    return res.status(500).json({ msg: "Server error." });
  }
});

/* ============================================================
   📍 RESET PASSWORD
============================================================ */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res.status(400).json({ msg: "Email + new password required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found." });

    if (!user.resetPasswordVerified)
      return res.status(400).json({ msg: "OTP verification required." });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordVerified = false;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      msg: "Password reset successful.",
    });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    return res.status(500).json({ msg: "Server error." });
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
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ msg: "User not found." });

    return res.status(200).json({ success: true, user: cleanUser(user) });
  } catch (err) {
    console.error("❌ Auth error:", err);
    return res.status(401).json({ msg: "Invalid token." });
  }
});

export default router;
