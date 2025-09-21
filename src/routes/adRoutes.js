// Ad routes
import express from "express";
import {
  createAd,
  getAllAds,
  getActiveAdsForUser,
  trackImpression,
  trackClick,
} from "../controllers/adController.js";

import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Admin
router.post("/", isAuthenticated, createAd);
router.get("/", isAuthenticated, getAllAds);

// User-facing
router.get("/active", isAuthenticated, getActiveAdsForUser);
router.post("/impression", isAuthenticated, trackImpression);
router.post("/click", isAuthenticated, trackClick);

export default router;
