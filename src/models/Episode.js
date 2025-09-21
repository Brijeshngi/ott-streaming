import mongoose from "mongoose";

const episodeSchema = new mongoose.Schema(
  {
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, required: true }, // seconds
    episodeNumber: { type: Number, required: true },
    videoUrl: { type: String }, // S3/CloudFront HLS
    thumbnail: { type: String },
    subtitles: [
      {
        language: { type: String },
        url: { type: String },
      },
    ],
    dubbing: [
      {
        language: { type: String },
        audioUrl: { type: String },
      },
    ],
    releaseDate: { type: Date },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Episode = mongoose.model("Episode", episodeSchema);
