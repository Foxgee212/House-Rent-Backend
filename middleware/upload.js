import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "house_rent",
    allowed_formats: ["jpg", "png", "jpeg"], // allowed file types
  },
});

// File type validation
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Accept file
  } else {
    cb(new Error("Only image files are allowed!"), false); // Reject file
  }
};

// Configure Multer
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10 MB per file
  fileFilter,
});

// Middleware to catch errors and send proper response
export const uploadMiddleware = (req, res, next) => {
  const uploader = upload.single("image"); // or .array("images") for multiple
  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large. Max 10 MB allowed." });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // Other errors
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

export default upload;
