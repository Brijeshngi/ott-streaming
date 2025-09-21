import { Offer } from "../models/Offer.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import ErrorHandle from "../utils/errorHandle.js";

//
// 🔹 Create Offer (Admin)
//
export const createOffer = catchAsyncError(async (req, res, next) => {
  const { code, discountType, value, validFrom, validTo, usageLimit } =
    req.body;

  const exists = await Offer.findOne({ code });
  if (exists) return next(new ErrorHandle("Offer code already exists", 400));

  const offer = await Offer.create({
    code,
    discountType,
    value,
    validFrom,
    validTo,
    usageLimit,
  });

  res.status(201).json({ success: true, offer });
});

//
// 🔹 Get All Offers
//
export const getAllOffers = catchAsyncError(async (req, res, next) => {
  const offers = await Offer.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, offers });
});

//
// 🔹 Validate Offer Code
//
export const validateOffer = catchAsyncError(async (req, res, next) => {
  const { code, amount } = req.body;
  const offer = await Offer.findOne({ code, isActive: true });

  if (!offer) return next(new ErrorHandle("Invalid offer code", 404));

  const now = new Date();
  if (now < offer.validFrom || now > offer.validTo) {
    return next(new ErrorHandle("Offer expired or not valid yet", 400));
  }

  if (offer.usedCount >= offer.usageLimit) {
    return next(new ErrorHandle("Offer usage limit reached", 400));
  }

  // Apply discount
  let discountedAmount = amount;
  if (offer.discountType === "flat") {
    discountedAmount = Math.max(0, amount - offer.value);
  } else if (offer.discountType === "percentage") {
    discountedAmount = amount - (amount * offer.value) / 100;
  }

  res.status(200).json({
    success: true,
    discountedAmount,
    offer,
  });
});

//
// 🔹 Deactivate Offer (Admin)
//
export const deactivateOffer = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const offer = await Offer.findById(id);
  if (!offer) return next(new ErrorHandle("Offer not found", 404));

  offer.isActive = false;
  await offer.save();

  res.status(200).json({ success: true, message: "Offer deactivated", offer });
});
