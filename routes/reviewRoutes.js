import express from "express";
import {
  addOrUpdateReview,
  getReviewsForContent,
  deleteReview,
  getAverageRating,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Add or update review
router.post("/", isAuthenticated, addOrUpdateReview);

// Get all reviews for a content
router.get("/:contentId", isAuthenticated, getReviewsForContent);

// Delete own review
router.delete("/:reviewId", isAuthenticated, deleteReview);

// Get average rating of content
router.get("/:contentId/average", isAuthenticated, getAverageRating);

export default router;
