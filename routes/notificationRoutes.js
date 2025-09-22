import express from "express";
import {
  generateNotifications,
  getNotifications,
  markNotificationRead,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Notifications routes
router.post("/generate", isAuthenticated, generateNotifications);
router.get("/", isAuthenticated, getNotifications);
router.put("/:notificationId/read", isAuthenticated, markNotificationRead);

export default router;
