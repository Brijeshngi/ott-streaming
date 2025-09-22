import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ["movie", "series"], required: true },

    genres: [String],
    language: { type: String },
    availableLanguages: [String],
    ageRating: { type: String, enum: ["G", "PG", "PG-13", "R", "18+"] },

    releaseDate: { type: Date },
    duration: { type: Number }, // for movies
    seasons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Season" }],

    thumbnail: { type: String },
    bannerImage: { type: String },
    trailerUrl: { type: String },

    storage: {
      videoUrl: { type: String }, // master HLS/DASH URL
      resolutions: [String], // ["240p", "480p", "720p", "1080p", "4k"]
      drmProtected: { type: Boolean, default: false },
    },

    tags: [String],
    ratings: [{ type: mongoose.Schema.Types.ObjectId, ref: "ContentRating" }],

    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["published", "draft", "archived"],
      default: "published",
    },
  },
  { timestamps: true }
);

export const Content = mongoose.model("Content", contentSchema);
