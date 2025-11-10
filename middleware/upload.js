// middleware/upload.js
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// =========================
// Configure Cloudinary storage
// =========================
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "house_rent",              // Cloudinary folder
    allowed_formats: ["jpg", "png", "jpeg"], // allowed file types
  },
});

// =========================
// File type validation
// =========================
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Accept file
  } else {
    cb(new Error("Only image files are allowed!"), false); // Reject file
  }
};

// =========================
// Multer instance
// =========================
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10 MB per file
});

// =========================
// Middleware to handle multiple uploads and errors
// =========================
export const uploadMiddleware = (fieldName = "images", maxCount = 20) => {
  return (req, res, next) => {
    const uploader = upload.array(fieldName, maxCount);

    uploader(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Max 10 MB allowed." });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({ message: `Unexpected file field. Use '${fieldName}'.` });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        // Other errors
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

// =========================
// Default export for direct usage in routes
// =========================
export default upload;
