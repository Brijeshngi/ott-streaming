// routes/drmRoutes.js
import express from "express";
import fs from "fs";
import path from "path";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.get("/key/:baseName", isAuthenticated, (req, res) => {
  const { baseName } = req.params;
  const keyPath = path.join("uploads/hls", baseName, "enc.key");

  if (!fs.existsSync(keyPath)) {
    return res.status(404).json({ success: false, message: "Key not found" });
  }

  res.setHeader("Content-Type", "application/octet-stream");
  res.sendFile(path.resolve(keyPath));
});

export default router;
