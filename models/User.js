import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      unique: true,
      minlength: 10,
      maxlength: 10,
    },
    password: { type: String, required: true, select: false, minlength: 6 },
    role: { type: String, enum: ["User", "Admin"], default: "User" },
    profilePicture: { url: String, uploadedAt: Date },
    dateOfBirth: { type: Date },
    preferences: { languages: [String], genres: [String] },
    accountStatus: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Deleted"],
      default: "Active",
    },
    Likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Content" }],
    Dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Content" }],

    // references to other models
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    devices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Device" }],
    watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Content" }],
    watchHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "WatchHistory" },
    ],
    ratings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Rating" }],
    Notifications: [
      {
        content: { type: mongoose.Schema.Types.ObjectId, ref: "Content" },
        message: { type: String },
        createdAt: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
      },
    ],

    auditLogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "AuditLog" }],

    // Security
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordTokenExpire: { type: Date },
    lastLoginAt: { type: Date },
    lastLoginIP: { type: String },
    lastLoginDevice: { type: String },
  },

  { timestamps: true }
);

// 🔐 Password Hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 🔑 Compare Password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🎟 JWT Token
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// 🔑 Reset Token
userSchema.methods.getResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordTokenExpire = Date.now() + 15 * 60 * 1000;
  return resetToken;
};

// 🚫 Account Lock Check
userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment Failed Logins
userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.failedLoginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 5) {
      this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 mins lock
    }
  }
  await this.save();
};

export const User = mongoose.model("User", userSchema);
