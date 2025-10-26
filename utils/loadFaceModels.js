// utils/loadFaceModels.js
import * as faceapi from "face-api.js";
import fs from "fs";
import path from "path";

export async function loadFaceModels() {
  const modelPath = path.join(process.cwd(), "models/face");
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model folder not found: ${modelPath}`);
  }

  console.log("🧠 Loading FaceAPI models...");
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
    faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
    faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath),
  ]);
  console.log("✅ FaceAPI models loaded successfully");
}
