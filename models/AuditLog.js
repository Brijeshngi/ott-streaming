import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: {
    type: String,
    enum: [
      "login",
      "logout",
      "password_reset",
      "subscription_change",
      "profile_update",
    ],
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
