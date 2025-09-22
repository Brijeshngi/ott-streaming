import mongoose from "mongoose";

const watchHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: "Content" },
  lastWatchedAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
});

export const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);
