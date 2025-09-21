import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true }, // daily snapshot

    // User metrics
    totalUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 }, // DAU
    churnedUsers: { type: Number, default: 0 },

    // Content metrics
    topContent: [
      {
        contentId: { type: mongoose.Schema.Types.ObjectId, ref: "Content" },
        views: Number,
      },
    ],
    mostWatchedGenres: [{ genre: String, views: Number }],

    // Subscription metrics
    newSubscriptions: { type: Number, default: 0 },
    cancelledSubscriptions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },

    // Ad metrics
    adImpressions: { type: Number, default: 0 },
    adClicks: { type: Number, default: 0 },

    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Analytics = mongoose.model("Analytics", analyticsSchema);
