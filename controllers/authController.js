import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";




export const registerUser = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const userExist = await User.findOne({ email });
    if (userExist)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword, role });

    // ✅ Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Send user and token
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const loginUser = async (req, res)=>{
    const { email, password } = req.body;

    try{
        const user = await User.findOne({email});
        if(!user) return res.status(400).json({message: "Invalid credentials"});

        const token = jwt.sign({id: user.id, role: user.role},
            process.env.JWT_SECRET,{
                expiresIn: "7d",
            }
        );
        res.json({token, user: { email: user.email, role: user.role}});
    }catch (err){
        res.status(500).json({error: err.message});
    }
};