import express from "express";
import {
  getAdAnalytics,
  getUserEngagementAnalytics,
  getRevenueAnalytics,
  getAdminDashboard,
} from "../controllers/analyticsController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Admin-only
router.get("/ads", isAuthenticated, getAdAnalytics);
// Admin-only
router.get("/user-engagement", isAuthenticated, getUserEngagementAnalytics);
router.get("/revenue", isAuthenticated, getRevenueAnalytics);
router.get("/admin-dashboard", isAuthenticated, getAdminDashboard);

export default router;
