import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ msg: "No token, authorization denied" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return res.status(401).json({ msg: "No token, authorization denied" });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ attach decoded payload to request
    req.user = {
      id: verified.id,
      role: verified.role,
    };

    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};

export default auth;
