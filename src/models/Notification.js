import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: ["subscription", "content", "system", "promotion"],
  },
  title: { type: String },
  message: { type: String },
  isRead: { type: Boolean, default: false },
  deliveryMethod: {
    type: [String],
    enum: ["email", "push", "sms", "in-app"],
    default: ["in-app"],
  },
  sentAt: { type: Date, default: Date.now },
});

export const Notification = mongoose.model("Notification", notificationSchema);
