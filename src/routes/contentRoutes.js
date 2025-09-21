import {
  getContentDashboard,
  searchContent,
} from "../controllers/contentController.js";
import express from "express";
import { uploadVideo } from "../middlewares/upload.js";
import {
  uploadContent,
  streamContent,
} from "../controllers/contentController.js";
import { isAuthenticated } from "../middlewares/auth.js";
// Home/Dashboard content
const router = express.Router();
router.get("/dashboard", getContentDashboard);
router.get("/search", searchContent);
// Upload new content (admin only ideally)
router.post(
  "/upload",
  isAuthenticated,
  uploadVideo.single("video"),
  uploadContent
);

// Stream video
router.get("/stream/:key", streamContent);

export default router;
