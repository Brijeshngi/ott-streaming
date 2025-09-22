import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  deviceId: { type: String, required: true },
  deviceType: {
    type: String,
    enum: ["mobile", "web", "tv", "tablet", "other"],
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  activeToken: { type: String },
  loggedInAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date },
});

export const Device = mongoose.model("Device", deviceSchema);
