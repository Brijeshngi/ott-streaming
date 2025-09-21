import { Subscription } from "../models/Subscription.js";
import { Offer } from "../models/Offer.js";
import { Transaction } from "../models/Transaction.js";
import { createOrder, verifyPayment } from "../services/paymentService.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import ErrorHandle from "../utils/errorHandle.js";
import {
  verifyWebhookSignature,
  handleRazorpayWebhook,
} from "../services/paymentService.js";
//
// 🔹 Apply Offer
//
const applyOffer = async (planPrice, offerCode) => {
  if (!offerCode) return { finalPrice: planPrice, offer: null };

  const offer = await Offer.findOne({ code: offerCode, isActive: true });
  if (!offer) throw new Error("Invalid or expired offer code");

  const now = new Date();
  if (now < offer.validFrom || now > offer.validTo) {
    throw new Error("Offer not valid");
  }

  if (offer.usedCount >= offer.usageLimit) {
    throw new Error("Offer usage limit reached");
  }

  let finalPrice = planPrice;
  if (offer.discountType === "flat") {
    finalPrice = Math.max(0, planPrice - offer.value);
  } else if (offer.discountType === "percentage") {
    finalPrice = planPrice - (planPrice * offer.value) / 100;
  }

  return { finalPrice, offer };
};

//
// 🔹 Start Subscription (create order)
//
export const startSubscription = catchAsyncError(async (req, res, next) => {
  const { planType, duration, price, offerCode } = req.body;
  const userId = req.user._id;

  // Apply offer
  const { finalPrice, offer } = await applyOffer(price, offerCode);

  // Create Razorpay order
  const order = await createOrder(finalPrice);

  // Save transaction
  const tx = await Transaction.create({
    userId,
    amount: finalPrice,
    status: "pending",
    razorpayOrderId: order.id,
    offerApplied: offer?._id,
  });

  res.status(200).json({
    success: true,
    order,
    transactionId: tx._id,
  });
});

//
// 🔹 Verify Payment + Activate Subscription
//
export const verifySubscriptionPayment = catchAsyncError(
  async (req, res, next) => {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      transactionId,
      planType,
      duration,
      price,
    } = req.body;
    const userId = req.user._id;

    const tx = await Transaction.findById(transactionId);
    if (!tx) return next(new ErrorHandle("Transaction not found", 404));

    const isValid = verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
    if (!isValid) {
      tx.status = "failed";
      await tx.save();
      return next(new ErrorHandle("Payment verification failed", 400));
    }

    // Activate subscription
    const startDate = new Date();
    let expiryDate = new Date(startDate);
    if (duration === "monthly") expiryDate.setMonth(expiryDate.getMonth() + 1);
    if (duration === "quarterly")
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    if (duration === "yearly")
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const subscription = await Subscription.create({
      userId,
      planType,
      price,
      duration,
      startDate,
      expiryDate,
      offerApplied: tx.offerApplied,
    });

    // Update transaction
    tx.status = "success";
    tx.razorpayPaymentId = razorpayPaymentId;
    tx.razorpaySignature = razorpaySignature;
    tx.subscriptionId = subscription._id;
    await tx.save();

    res.status(200).json({
      success: true,
      message: "Subscription activated",
      subscription,
    });
  }
);

export const razorpayWebhook = catchAsyncError(async (req, res, next) => {
  const signature = req.headers["x-razorpay-signature"];
  const isValid = verifyWebhookSignature(req.body, signature);

  if (!isValid) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid webhook signature" });
  }

  // Handle Razorpay event
  await handleRazorpayWebhook(req.body);

  res.status(200).json({ success: true, message: "Webhook processed" });
});
