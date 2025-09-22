import express from "express";
import {
  startWatching,
  stopWatching,
  getActiveViewers,
} from "../controllers/watchControllers.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Start watching a content
router.post("/start", isAuthenticated, startWatching);

// Stop watching a content
router.post("/stop", isAuthenticated, stopWatching);

// Get active viewers for a content
router.get("/:contentId/viewers", isAuthenticated, getActiveViewers);

export default router;
