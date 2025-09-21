import mongoose from "mongoose";

const seasonSchema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
    },
    seasonNumber: { type: Number, required: true },
    title: { type: String },
    description: { type: String },
    releaseDate: { type: Date },
    episodes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Episode" }],
  },
  { timestamps: true }
);

export const Season = mongoose.model("Season", seasonSchema);
