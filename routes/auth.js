// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Allowed roles
const allowedRoles = ["tenant", "landlord"];

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", async (req, res) => {
  try {

    const { name, email, password, role, location = "", bio = "", phone = "" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Name, email, and password are required" });
    }

    // ✅ Validate role
    const allowedRoles = ["tenant", "landlord", "admin"];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }

    // ✅ Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // ✅ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Create new user with all fields
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "tenant",
      location: location || "",
      bio: bio || "",
      phone: phone || "",
    });

    await newUser.save();

    // ✅ Generate token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Send response
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        location: newUser.location,
        bio: newUser.bio,
        phone: newUser.phone,
      },
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT
 * @access  Public
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const { password: _, ...userData } = user.toObject(); // Exclude password

    res.status(200).json({
      token,
      user: userData,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get logged-in user info
 * @access  Private
 */
router.get("/me", async (req, res) => {
  // Correct way to get Authorization header
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ msg: "Token is not valid" });
  }
});

export default router;
