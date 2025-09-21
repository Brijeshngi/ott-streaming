import { Ad } from "../models/Ad.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import ErrorHandle from "../utils/errorHandle.js";

//
// 🔹 Create Ad (Admin)
//
export const createAd = catchAsyncError(async (req, res, next) => {
  const {
    title,
    advertiser,
    mediaUrl,
    duration,
    targetAudience,
    ctaLink,
    startDate,
    endDate,
  } = req.body;

  const ad = await Ad.create({
    title,
    advertiser,
    mediaUrl,
    duration,
    targetAudience,
    ctaLink,
    startDate,
    endDate,
  });

  res.status(201).json({ success: true, ad });
});

//
// 🔹 Get All Ads (Admin)
//
export const getAllAds = catchAsyncError(async (req, res, next) => {
  const ads = await Ad.find();
  res.status(200).json({ success: true, ads });
});

//
// 🔹 Get Active Ads for User (Targeting)
//
export const getActiveAdsForUser = catchAsyncError(async (req, res, next) => {
  const { age, region, genre } = req.query;

  const now = new Date();

  const ads = await Ad.find({
    status: "active",
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { "targetAudience.ageGroup": { $in: [age] } },
      { "targetAudience.regions": { $in: [region] } },
      { "targetAudience.genres": { $in: [genre] } },
    ],
  }).limit(5);

  res.status(200).json({ success: true, ads });
});

//
// 🔹 Increment Impressions
//
export const trackImpression = catchAsyncError(async (req, res, next) => {
  const { adId } = req.body;
  const ad = await Ad.findById(adId);
  if (!ad) return next(new ErrorHandle("Ad not found", 404));

  ad.impressions += 1;

  if (ad.maxImpressions && ad.impressions >= ad.maxImpressions) {
    ad.status = "expired";
  }

  await ad.save();
  res.status(200).json({ success: true, message: "Impression tracked" });
});

//
// 🔹 Track Clicks
//
export const trackClick = catchAsyncError(async (req, res, next) => {
  const { adId } = req.body;
  const ad = await Ad.findById(adId);
  if (!ad) return next(new ErrorHandle("Ad not found", 404));

  ad.clicks += 1;
  await ad.save();

  res
    .status(200)
    .json({ success: true, message: "Click tracked", ctaLink: ad.ctaLink });
});
