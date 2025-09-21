import express from "express";
import {
  registerUser,
  loginUser,
  logoutDevice,
  logoutAll,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  deleteAccount,
  getUserDashboard,
  getContinueWatching,
  upgradeSubscription,
  cancelSubscription,
  getContentOnsubsriptionPlan,
  getUserDashboard,
  likeContent,
  dislikeContent,
  getLikedContent,
  getDislikedContent,
  addOrUpdateReview,
  getReviewsForContent,
  deleteReview,
  getAverageRating,
  getRecommendations,
  generateNotifications,
  getNotifications,
  markNotificationRead,
} from "../controllers/userController.js";
import {
  startWatching,
  stopWatching,
  getActiveViewers,
} from "../controllers/watchController.js";

import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// 🔹 Auth
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", isAuthenticated,refreshAccessToken);
router.post("/logout-device", isAuthenticated, logoutDevice);
router.post("/logout-all", isAuthenticated, logoutAll);

// 🔹 Profile
router.get("/me", isAuthenticated, getProfile);
router.put("/me", isAuthenticated, updateProfile);
router.delete("/me", isAuthenticated, deleteAccount);

// 🔹 Password
router.put("/change-password", isAuthenticated, changePassword);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

// 🔹 Watchlist
router.post("/watchlist/add", isAuthenticated, addToWatchlist);
router.post("/watchlist/remove", isAuthenticated, removeFromWatchlist);
router.post("/watchlist/remove", isAuthenticated, getWatchlist);

// user Dashboard
router.get("/dashboard", isAuthenticated, getUserDashboard);
router.get("/continue-watching", isAuthenticated, getContinueWatching);

// subscription
router.put("/subscription/upgrade", isAuthenticated, upgradeSubscription);
router.post("/subscription/cancel", isAuthenticated, cancelSubscription);
router.get(
  "/content/subscription-plan",
  isAuthenticated,
  getContentOnsubsriptionPlan
);

// Likes / Dislikes routes
router.post("/likes", isAuthenticated, likeContent);
router.post("/dislikes", isAuthenticated, dislikeContent);
router.get("/likes", isAuthenticated, getLikedContent);
router.get("/dislikes", isAuthenticated, getDislikedContent);

// Reviews & Ratings
router.post("/reviews", isAuthenticated, addOrUpdateReview);
router.get("/reviews/:contentId", isAuthenticated, getReviewsForContent);
router.delete("/reviews/:reviewId", isAuthenticated, deleteReview);
router.get("/reviews/:contentId/average", isAuthenticated, getAverageRating);

// Recommendations route
router.get("/recommendations", isAuthenticated, getRecommendations);

// Notifications routes
router.post("/notifications/generate", isAuthenticated, generateNotifications);
router.get("/notifications", isAuthenticated, getNotifications);
router.put(
  "/notifications/:notificationId/read",
  isAuthenticated,
  markNotificationRead
);

// watchers routes

router.post("/watch/start", isAuthenticated, startWatching);
router.post("/watch/stop", isAuthenticated, stopWatching);
router.get("/watch/:contentId/viewers", isAuthenticated, getActiveViewers);
export default router;
