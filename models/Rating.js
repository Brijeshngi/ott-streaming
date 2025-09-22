import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: "Content" },
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
});

export const Rating = mongoose.model("Rating", ratingSchema);
