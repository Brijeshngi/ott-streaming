import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    advertiser: { type: String }, // brand/company
    mediaUrl: { type: String, required: true }, // video/image URL
    duration: { type: Number, default: 30 }, // seconds

    targetAudience: {
      ageGroup: [String], // ["18-25", "25-35"]
      regions: [String], // e.g. ["India", "US"]
      genres: [String], // show ads only in Action/Drama
    },

    ctaLink: { type: String }, // call-to-action (visit site/buy)
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    maxImpressions: { type: Number }, // cap for campaign

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ["active", "paused", "expired"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Ad = mongoose.model("Ad", adSchema);
