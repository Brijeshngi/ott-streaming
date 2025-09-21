import { Ad } from "../models/Ad.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import { WatchHistory } from "../models/WatchHistory.js";
import { User } from "../models/User.js";
import { Content } from "../models/Content.js";
import { Device } from "../models/Device.js";
import { Transaction } from "../models/Transaction.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
// 🔹 Ad Performance Analytics
export const getAdAnalytics = catchAsyncError(async (req, res, next) => {
  const pipeline = [
    {
      $project: {
        title: 1,
        advertiser: 1,
        impressions: 1,
        clicks: 1,
        ctr: {
          $cond: [
            { $eq: ["$impressions", 0] },
            0,
            { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
          ],
        },
        cpm: {
          $cond: [
            { $eq: ["$impressions", 0] },
            0,
            { $divide: ["$budget", { $divide: ["$impressions", 1000] }] },
          ],
        },
      },
    },
    { $sort: { ctr: -1 } },
  ];

  const ads = await Ad.aggregate(pipeline);

  // Top advertisers
  const topAdvertisers = await Ad.aggregate([
    {
      $group: {
        _id: "$advertiser",
        totalImpressions: { $sum: "$impressions" },
        totalClicks: { $sum: "$clicks" },
        campaigns: { $sum: 1 },
      },
    },
    { $sort: { totalImpressions: -1 } },
    { $limit: 5 },
  ]);

  res.status(200).json({
    success: true,
    ads,
    topAdvertisers,
  });
});

// 🔹 User Engagement Analytics
export const getUserEngagementAnalytics = catchAsyncError(
  async (req, res, next) => {
    const now = new Date();
    const last30Days = new Date(now.setDate(now.getDate() - 30));

    // 1. Total Watch Time per User
    const watchTime = await WatchHistory.aggregate([
      {
        $group: {
          _id: "$userId",
          totalWatchTime: { $sum: "$progress" }, // progress in seconds
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          email: "$user.email",
          totalWatchTime: 1,
        },
      },
      { $sort: { totalWatchTime: -1 } },
    ]);

    // 2. Top Genres Watched
    const topGenres = await WatchHistory.aggregate([
      {
        $lookup: {
          from: "contents",
          localField: "contentId",
          foreignField: "_id",
          as: "content",
        },
      },
      { $unwind: "$content" },
      { $unwind: "$content.genres" },
      {
        $group: {
          _id: "$content.genres",
          totalViews: { $sum: 1 },
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: 5 },
    ]);

    // 3. DAU / MAU
    const dau = await User.aggregate([
      {
        $match: {
          lastLoginAt: { $gte: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        },
      },
      { $count: "dailyActiveUsers" },
    ]);

    const mau = await User.aggregate([
      {
        $match: {
          lastLoginAt: { $gte: last30Days },
        },
      },
      { $count: "monthlyActiveUsers" },
    ]);

    // 4. Active Devices per User
    const activeDevices = await Device.aggregate([
      {
        $group: {
          _id: "$userId",
          deviceCount: { $sum: 1 },
          devices: { $push: "$deviceType" },
        },
      },
    ]);

    // 5. Retention: Returning vs New Users (last 30 days)
    const retention = await User.aggregate([
      {
        $facet: {
          newUsers: [
            { $match: { createdAt: { $gte: last30Days } } },
            { $count: "count" },
          ],
          returningUsers: [
            {
              $match: {
                lastLoginAt: { $gte: last30Days },
                createdAt: { $lt: last30Days },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        watchTime,
        topGenres,
        dau: dau[0]?.dailyActiveUsers || 0,
        mau: mau[0]?.monthlyActiveUsers || 0,
        activeDevices,
        retention: {
          newUsers: retention[0]?.newUsers[0]?.count || 0,
          returningUsers: retention[0]?.returningUsers[0]?.count || 0,
        },
      },
    });
  }
);

// 🔹 Revenue Analytics
export const getRevenueAnalytics = catchAsyncError(async (req, res, next) => {
  // 1. Total Revenue
  const totalRevenueAgg = await Transaction.aggregate([
    { $match: { status: "success" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        totalTx: { $sum: 1 },
      },
    },
  ]);

  const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;
  const totalTx = totalRevenueAgg[0]?.totalTx || 0;

  // 2. Revenue by Plan
  const revenueByPlan = await Subscription.aggregate([
    {
      $lookup: {
        from: "transactions",
        localField: "userId",
        foreignField: "userId",
        as: "tx",
      },
    },
    { $unwind: "$tx" },
    { $match: { "tx.status": "success" } },
    {
      $group: {
        _id: "$planType",
        revenue: { $sum: "$tx.amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  // 3. Monthly Recurring Revenue (MRR)
  const monthlyRevenue = await Transaction.aggregate([
    { $match: { status: "success" } },
    {
      $group: {
        _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 6 }, // last 6 months
  ]);

  // 4. ARPU (Average Revenue Per User)
  const totalUsers = await User.countDocuments();
  const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;

  // 5. Transaction Breakdown
  const txBreakdown = await Transaction.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        amount: { $sum: "$amount" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    revenueAnalytics: {
      totalRevenue,
      totalTransactions: totalTx,
      revenueByPlan,
      monthlyRevenue,
      arpu,
      txBreakdown,
    },
  });
});

export const getAdminDashboard = catchAsyncError(async (req, res, next) => {
  const now = new Date();
  const last30Days = new Date(now.setDate(now.getDate() - 30));

  // 👥 User Stats
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ accountStatus: "Active" });
  const dau = await User.countDocuments({
    lastLoginAt: { $gte: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
  });
  const mau = await User.countDocuments({ lastLoginAt: { $gte: last30Days } });

  // 🎬 Content Stats
  const totalContent = await Content.countDocuments({ status: "published" });
  const trendingContent = await Content.find({ isTrending: true })
    .limit(5)
    .select("title thumbnail views");
  const topRatedContent = await Content.find({ averageRating: { $gte: 4 } })
    .sort({ averageRating: -1 })
    .limit(5)
    .select("title thumbnail averageRating");

  // 📊 Revenue Stats
  const revenueAgg = await Transaction.aggregate([
    { $match: { status: "success" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        totalTx: { $sum: 1 },
      },
    },
  ]);
  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
  const totalTx = revenueAgg[0]?.totalTx || 0;
  const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;

  const revenueByPlan = await Subscription.aggregate([
    {
      $lookup: {
        from: "transactions",
        localField: "userId",
        foreignField: "userId",
        as: "tx",
      },
    },
    { $unwind: "$tx" },
    { $match: { "tx.status": "success" } },
    {
      $group: {
        _id: "$planType",
        revenue: { $sum: "$tx.amount" },
      },
    },
  ]);

  // 📺 Ads Stats
  const activeAds = await Ad.countDocuments({ status: "active" });
  const adPerformance = await Ad.aggregate([
    {
      $project: {
        title: 1,
        advertiser: 1,
        impressions: 1,
        clicks: 1,
        ctr: {
          $cond: [
            { $eq: ["$impressions", 0] },
            0,
            { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
          ],
        },
      },
    },
    { $sort: { ctr: -1 } },
    { $limit: 5 },
  ]);

  res.status(200).json({
    success: true,
    dashboard: {
      users: {
        totalUsers,
        activeUsers,
        dau,
        mau,
      },
      content: {
        totalContent,
        trendingContent,
        topRatedContent,
      },
      revenue: {
        totalRevenue,
        totalTransactions: totalTx,
        arpu,
        revenueByPlan,
      },
      ads: {
        activeAds,
        adPerformance,
      },
    },
  });
});
