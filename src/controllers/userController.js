import { User } from "../models/User.js";
import { Device } from "../models/Device.js";
import { WatchHistory } from "../models/WatchHistory.js";
import { Rating } from "../models/Rating.js";
import { Notification } from "../models/Notification.js";
import { AuditLog } from "../models/AuditLog.js";
import { Subscription } from "../models/Subscription.js";
import { Content } from "../models/Content.js";
import ErrorHandle from "../utils/errorHandle.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import { sendToken } from "../utils/sendToken.js";
import { Review } from "../models/Review.js";
import { generateTokens, saveRefreshToken, blacklistToken, isBlacklisted } from "../utils/tokenUtils.js";

import crypto from "crypto";

//
// 🔹 Register
//
export const registerUser = catchAsyncError(async (req, res, next) => {
  const { firstName, lastName, email, contact, password } = req.body;

  if (!email || !contact || !password) {
    return next(new ErrorHandle("Please provide all required fields", 400));
  }

  const existing = await User.findOne({ email });
  if (existing) return next(new ErrorHandle("User already exists", 400));

  const user = await User.create({
    firstName,
    lastName,
    email,
    contact,
    password,
  });

  await AuditLog.create({
    userId: user._id,
    action: "register",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(201).json({success:true,
  message:"Registered successfully"})
});

//
// 🔹 Login
//
export const loginUser = catchAsyncError(async (req, res, next) => {
  const { email, password, deviceId, deviceType } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) return next(new ErrorHandle("Invalid email or password", 401));

  if (user.isAccountLocked()) {
    return next(new ErrorHandle("Account locked. Try again later.", 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    return next(new ErrorHandle("Invalid email or password", 401));
  }

   // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user, refreshToken);

  // Attach device entry
  let device = await Device.findOne({ deviceId, userId: user._id });

  if (!device) {
    const count = await Device.countDocuments({ userId: user._id });
    if (count >= 5)
      return next(new ErrorHandle("Maximum device limit reached", 403));

    device = await Device.create({
      userId: user._id,
      deviceId: deviceId || crypto.randomUUID(),
      deviceType: deviceType || "web",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      activeToken: refreshToken,
    });

    user.devices.push(device._id);
  } else {
    device.activeToken = refreshToken;
    device.lastActiveAt = new Date();
    await device.save();
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  user.lastLoginIP = req.ip;
  user.lastLoginDevice = device.deviceType;
  await user.save();

  await AuditLog.create({
    userId: user._id,
    action: "login",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
 res
    .status(200)
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })
    .json({ success: true, accessToken });
});

// ====================== REFRESH ACCESS TOKEN ======================
export const refreshAccessToken = catchAsyncError(async (req, res, next) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (!token) return next(new ErrorHandle("Refresh token required", 401));

  // Check blacklist
  const blacklisted = await isBlacklisted(token);
  if (blacklisted) return next(new ErrorHandle("Token blacklisted", 403));

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new ErrorHandle("User not found", 404));

    // Check if refresh token exists in user's devices
    const valid = user.devices.some((d) => d.refreshToken === token);
    if (!valid) return next(new ErrorHandle("Invalid refresh token", 403));

    // Issue new access token
    const accessToken = jwt.sign(
      { id: user._id, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.status(200).json({ success: true, accessToken });
  } catch (err) {
    return next(new ErrorHandle("Invalid or expired refresh token", 401));
  }
});


//
// 🔹 Logout one device
//
export const logoutDevice = catchAsyncError(async (req, res, next) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (token) {
    try {
      const decoded = jwt.decode(token);
      const exp = decoded.exp - Math.floor(Date.now() / 1000);
      await blacklistToken(token, exp);
    } catch (err) {
      console.log("Error decoding refresh token:", err.message);
    }

    // Remove token from user.devices
    const user = await User.findById(req.user._id);
    if (user) {
      user.devices = user.devices.filter((d) => d.refreshToken !== token);
      await user.save();
    }
  }

  res
    .clearCookie("refreshToken")
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
});

//
// 🔹 Logout all devices
//
export const logoutAll = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.devices = [];
    user.RefreshTokens = [];
    await user.save();
  }

  res
    .clearCookie("refreshToken")
    .status(200)
    .json({ success: true, message: "Logged out from all devices" });
});

//
// 🔹 Profile
//
export const getProfile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate("subscriptionId")
    .populate("devices")
    .populate("watchlist", "title thumbnail")
    .populate("ratings")
    .populate("notifications")
    .populate("auditLogs");

  if (!user) return next(new ErrorHandle("User not found", 404));

  res.status(200).json({ success: true, user });
});

export const updateProfile = catchAsyncError(async (req, res, next) => {
  const updates = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  await AuditLog.create({
    userId: req.user._id,
    action: "profile_update",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({ success: true, user });
});

//
// 🔹 Password
//
export const changePassword = catchAsyncError(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!user) return next(new ErrorHandle("User not found", 404));

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) return next(new ErrorHandle("Incorrect current password", 401));

  user.password = newPassword;
  await user.save();

  await AuditLog.create({
    userId: req.user._id,
    action: "password_change",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({ success: true, message: "Password updated" });
});

export const forgotPassword = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return next(new ErrorHandle("No user found with this email", 404));

  const resetToken = user.getResetToken();
  await user.save({ validateBeforeSave: false });

  // TODO: integrate email service
  res.status(200).json({ success: true, resetToken });
});

export const resetPassword = catchAsyncError(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordTokenExpire: { $gt: Date.now() },
  });

  if (!user) return next(new ErrorHandle("Invalid or expired token", 400));

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpire = undefined;
  await user.save();

  await AuditLog.create({
    userId: user._id,
    action: "password_reset",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({ success: true, message: "Password reset successful" });
});

//
// 🔹 Delete Account
//
export const deleteAccount = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandle("User not found", 404));

  await Device.deleteMany({ userId: user._id });
  await WatchHistory.deleteMany({ userId: user._id });
  await Rating.deleteMany({ userId: user._id });
  await Notification.deleteMany({ userId: user._id });
  await AuditLog.deleteMany({ userId: user._id });
  await Subscription.deleteMany({ userId: user._id });

  await user.deleteOne();

  res.status(200).json({ success: true, message: "Account deleted" });
});

export const getUserDashboard = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;

  const result = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },

    // 🔹 Subscription
    {
      $lookup: {
        from: "subscriptions",
        localField: "subscriptionId",
        foreignField: "_id",
        as: "subscription",
      },
    },
    { $unwind: { path: "$subscription", preserveNullAndEmptyArrays: true } },

    // 🔹 Watchlist with content details
    {
      $lookup: {
        from: "contents",
        localField: "watchlist",
        foreignField: "_id",
        as: "watchlistDetails",
        pipeline: [
          { $project: { title: 1, thumbnail: 1, type: 1, isTrending: 1 } },
        ],
      },
    },

    // 🔹 Recent WatchHistory with content details
    {
      $lookup: {
        from: "watchhistories",
        localField: "_id",
        foreignField: "userId",
        as: "watchHistoryDetails",
        pipeline: [
          { $sort: { lastWatchedAt: -1 } },
          { $limit: 10 }, // last 10
          {
            $lookup: {
              from: "contents",
              localField: "contentId",
              foreignField: "_id",
              as: "contentDetails",
              pipeline: [{ $project: { title: 1, thumbnail: 1, duration: 1 } }],
            },
          },
          { $unwind: "$contentDetails" },
        ],
      },
    },

    // 🔹 Notifications
    {
      $lookup: {
        from: "notifications",
        localField: "_id",
        foreignField: "userId",
        as: "notifications",
        pipeline: [
          { $sort: { sentAt: -1 } },
          { $limit: 5 }, // last 5
          { $project: { title: 1, message: 1, isRead: 1, sentAt: 1 } },
        ],
      },
    },

    // 🔹 Final projection
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        profilePicture: 1,
        accountStatus: 1,
        subscription: 1,
        watchlistDetails: 1,
        watchHistoryDetails: 1,
        notifications: 1,
      },
    },
  ]);

  if (!result || result.length === 0) {
    return next(new ErrorHandle("User not found", 404));
  }

  res.status(200).json({ success: true, dashboard: result[0] });
});

export const getContinueWatching = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;

  const history = await WatchHistory.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(userId), completed: false },
    },
    { $sort: { lastWatchedAt: -1 } },
    { $limit: 15 }, // Limit results for UI row

    {
      $lookup: {
        from: "contents",
        localField: "contentId",
        foreignField: "_id",
        as: "contentDetails",
        pipeline: [
          {
            $project: {
              title: 1,
              thumbnail: 1,
              duration: 1,
              type: 1,
              genres: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$contentDetails" },

    {
      $addFields: {
        progressPercent: {
          $multiply: [
            { $divide: ["$progress", "$contentDetails.duration"] },
            100,
          ],
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    results: history.map((h) => ({
      contentId: h.contentId,
      title: h.contentDetails.title,
      thumbnail: h.contentDetails.thumbnail,
      type: h.contentDetails.type,
      genres: h.contentDetails.genres,
      progress: h.progress,
      duration: h.contentDetails.duration,
      progressPercent: Math.min(100, Math.round(h.progressPercent)),
      lastWatchedAt: h.lastWatchedAt,
    })),
  });
});
// ====================== SUBSCRIPTION CONTROLLERS ======================

// Upgrade Subscription
export const upgradeSubscription = catchAsyncError(
  async (request, response, next) => {
    const { planType, duration } = request.body;
    // planType: ["basic", "super", "premium"]
    // duration: ["monthly", "quarterly", "yearly"]

    const user = await User.findById(request.user._id);
    if (!user) return next(new ErrorHandle("User not found", 404));

    if (!["basic", "super", "premium"].includes(planType)) {
      return next(new ErrorHandle("Invalid plan type", 400));
    }

    if (!["monthly", "quarterly", "yearly"].includes(duration)) {
      return next(new ErrorHandle("Invalid subscription duration", 400));
    }

    user.Subscription = {
      subscriptionPlan: {
        subscriptionPlanType: planType,
        subscriptionDuration: duration,
        upgradedAt: new Date(),
      },
    };

    await user.save();

    response.status(200).json({
      success: true,
      message: "Subscription upgraded successfully",
      currentPlan: user.Subscription.subscriptionPlan,
    });
  }
);

// Cancel Subscription
export const cancelSubscription = catchAsyncError(
  async (request, response, next) => {
    const user = await User.findById(request.user._id);

    if (!user) return next(new ErrorHandle("User not found", 404));
    if (!user.Subscription || !user.Subscription.subscriptionPlan) {
      return next(new ErrorHandle("No active subscription found", 400));
    }

    user.Subscription.subscriptionPlan.subscriptionPlanType = "free";
    user.Subscription.subscriptionPlan.subscriptionDuration = null;
    user.Subscription.subscriptionPlan.cancelledAt = new Date();

    await user.save();

    response.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      currentPlan: user.Subscription.subscriptionPlan,
    });
  }
);

// Content Based On Subscription
export const getContentOnsubsriptionPlan = catchAsyncError(
  async (request, response, next) => {
    const user = await User.findById(request.user._id);

    if (!user) return next(new ErrorHandle("User not found", 404));

    const planType =
      user.Subscription?.subscriptionPlan?.subscriptionPlanType || "free";

    // Example filtering logic (can expand later)
    let query = {};
    if (planType === "free") {
      query = { "trailer.url": { $exists: true, $ne: null } };
    } else if (planType === "basic") {
      query = { accessLevel: { $in: ["basic", "super", "premium"] } };
    } else if (planType === "super") {
      query = { accessLevel: { $in: ["super", "premium"] } };
    } else if (planType === "premium") {
      query = {}; // full access
    }

    const contentData = await Content.find(query);

    response.status(200).json({
      success: true,
      subscriptionPlan: planType,
      accessibleContent: contentData,
    });
  }
);

// ====================== WATCHLIST CONTROLLERS ======================

// Add content to watchlist
export const addToWatchlist = catchAsyncError(
  async (request, response, next) => {
    const { contentId } = request.body;
    if (!contentId) return next(new ErrorHandle("Content ID required", 400));

    const user = await User.findById(request.user._id);
    if (!user) return next(new ErrorHandle("User not found", 404));

    // Prevent duplicates
    if (user.watchlist?.includes(contentId)) {
      return next(new ErrorHandle("Content already in watchlist", 400));
    }

    user.watchlist = user.Watchlist || [];
    user.watchlist.push(contentId);

    await user.save();

    response.status(200).json({
      success: true,
      message: "Content added to watchlist",
      watchlist: user.watchlist,
    });
  }
);

// Remove content from watchlist
export const removeFromWatchlist = catchAsyncError(
  async (request, response, next) => {
    const { contentId } = request.params;

    const user = await User.findById(request.user._id);
    if (!user) return next(new ErrorHandle("User not found", 404));

    user.watchlist = user.Watchlist.filter(
      (id) => String(id) !== String(contentId)
    );

    await user.save();

    response.status(200).json({
      success: true,
      message: "Content removed from watchlist",
      watchlist: user.watchlist,
    });
  }
);

// Get watchlist
export const getWatchlist = catchAsyncError(async (request, response, next) => {
  const user = await User.findById(request.user._id).populate(
    "Watchlist", // assumes Watchlist stores Content IDs
    "contentTitle genre releaseDate thumbnail"
  );

  if (!user) return next(new ErrorHandle("User not found", 404));

  response.status(200).json({
    success: true,
    watchlist: user.watchlist || [],
  });
});

//
// Ratings and reviews
//
// Add or Update Review
export const addOrUpdateReview = catchAsyncError(
  async (request, response, next) => {
    const { contentId, rating, reviewText } = request.body;

    if (!contentId || !rating) {
      return next(new ErrorHandle("Content ID and rating are required", 400));
    }

    // Check if review already exists by this user
    let review = await Review.findOne({
      user: request.user._id,
      content: contentId,
    });

    if (review) {
      // Update existing review
      review.rating = rating;
      review.reviewText = reviewText;
      await review.save();
      return response.status(200).json({
        success: true,
        message: "Review updated successfully",
        review,
      });
    }

    // Create new review
    review = await Review.create({
      user: request.user._id,
      content: contentId,
      rating,
      reviewText,
    });

    response.status(201).json({
      success: true,
      message: "Review added successfully",
      review,
    });
  }
);

// Get all reviews for a content
export const getReviewsForContent = catchAsyncError(
  async (request, response, next) => {
    const { contentId } = request.params;

    const reviews = await Review.find({ content: contentId })
      .populate("user", "FirstName LastName")
      .sort({ createdAt: -1 });

    response.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  }
);

// Delete review (self delete)
export const deleteReview = catchAsyncError(async (request, response, next) => {
  const { reviewId } = request.params;

  const review = await Review.findOne({
    _id: reviewId,
    user: request.user._id,
  });

  if (!review) return next(new ErrorHandle("Review not found", 404));

  await review.deleteOne();

  response.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});

// Get average rating of a content
export const getAverageRating = catchAsyncError(
  async (request, response, next) => {
    const { contentId } = request.params;

    const result = await Review.aggregate([
      { $match: { content: new mongoose.Types.ObjectId(contentId) } },
      {
        $group: {
          _id: "$content",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    response.status(200).json({
      success: true,
      stats: result[0] || { averageRating: 0, totalReviews: 0 },
    });
  }
);

// ====================== RECOMMENDATION CONTROLLER ======================

export const getRecommendations = catchAsyncError(
  async (request, response, next) => {
    const user = await User.findById(request.user._id)
      .populate("Likes", "genre")
      .populate("Watchlist", "genre");

    if (!user) return next(new ErrorHandle("User not found", 404));

    // Collect user preferences from Likes + Watchlist
    let preferredGenres = [];

    if (user.Likes) {
      preferredGenres.push(...user.Likes.map((c) => c.genre));
    }
    if (user.watchlist) {
      preferredGenres.push(...user.watchlist.map((c) => c.genre));
    }

    // Fallback: if no preferences, recommend trending or latest content
    if (preferredGenres.length === 0) {
      const trendingContent = await Content.find({})
        .sort({ views: -1 }) // assuming you track views
        .limit(10);

      return response.status(200).json({
        success: true,
        recommendations: trendingContent,
        source: "trending",
      });
    }

    // Remove duplicates
    preferredGenres = [...new Set(preferredGenres)];

    // Query content that matches user's preferred genres
    const recommendations = await Content.find({
      genre: { $in: preferredGenres },
    })
      .limit(10)
      .sort({ createdAt: -1 });

    response.status(200).json({
      success: true,
      recommendations,
      source: "personalized",
    });
  }
);

// ====================== NOTIFICATIONS CONTROLLERS ======================

// Generate notifications (e.g., new content release)
export const generateNotifications = catchAsyncError(
  async (request, response, next) => {
    const user = await User.findById(request.user._id)
      .populate("Likes", "genre")
      .populate("Watchlist", "genre");

    if (!user) return next(new ErrorHandle("User not found", 404));

    // Collect preferred genres from Likes + Watchlist
    let preferredGenres = [];
    if (user.Likes) preferredGenres.push(...user.Likes.map((c) => c.genre));
    if (user.Watchlist)
      preferredGenres.push(...user.Watchlist.map((c) => c.genre));

    preferredGenres = [...new Set(preferredGenres)];

    // Find latest content matching preferred genres
    const newContent = await Content.find({
      genre: { $in: preferredGenres },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // last 7 days
    });

    if (newContent.length === 0) {
      return response.status(200).json({
        success: true,
        message: "No new notifications for now",
      });
    }

    // Add notifications to user
    newContent.forEach((content) => {
      user.Notifications.push({
        content: content._id,
        message: `New ${content.genre} release: ${content.contentTitle}`,
      });
    });

    await user.save();

    response.status(200).json({
      success: true,
      message: "Notifications generated",
      notifications: user.Notifications,
    });
  }
);

// Get user notifications
export const getNotifications = catchAsyncError(
  async (request, response, next) => {
    const user = await User.findById(request.user._id).populate(
      "Notifications.content",
      "contentTitle genre thumbnail releaseDate"
    );

    if (!user) return next(new ErrorHandle("User not found", 404));

    response.status(200).json({
      success: true,
      notifications: user.Notifications,
    });
  }
);

// Mark notification as read
export const markNotificationRead = catchAsyncError(
  async (request, response, next) => {
    const { notificationId } = request.params;

    const user = await User.findById(request.user._id);
    if (!user) return next(new ErrorHandle("User not found", 404));

    const notification = user.Notifications.id(notificationId);
    if (!notification)
      return next(new ErrorHandle("Notification not found", 404));

    notification.isRead = true;
    await user.save();

    response.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  }
);
