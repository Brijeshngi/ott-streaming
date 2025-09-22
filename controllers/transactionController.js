import { Transaction } from "../models/Transaction.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import ErrorHandle from "../utils/errorHandle.js";

//
// 🔹 Get All Transactions (Admin)
//
export const getAllTransactions = catchAsyncError(async (req, res, next) => {
  const transactions = await Transaction.find()
    .populate("userId", "email firstName lastName")
    .populate("subscriptionId", "planType duration");
  res.status(200).json({ success: true, transactions });
});

//
// 🔹 Get User Transactions
//
export const getUserTransactions = catchAsyncError(async (req, res, next) => {
  const transactions = await Transaction.find({ userId: req.user._id })
    .populate("subscriptionId", "planType duration status")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, transactions });
});

//
// 🔹 Get Single Transaction
//
export const getTransactionById = catchAsyncError(async (req, res, next) => {
  const tx = await Transaction.findById(req.params.id)
    .populate("userId", "email")
    .populate("subscriptionId", "planType duration");
  if (!tx) return next(new ErrorHandle("Transaction not found", 404));
  res.status(200).json({ success: true, tx });
});

//
// 🔹 Refund Transaction (Admin only, requires Razorpay refund API)
//
export const refundTransaction = catchAsyncError(async (req, res, next) => {
  const { razorpayPaymentId } = req.body;
  if (!razorpayPaymentId)
    return next(new ErrorHandle("Payment ID required", 400));

  // TODO: integrate with Razorpay refunds API
  const tx = await Transaction.findOne({ razorpayPaymentId });
  if (!tx) return next(new ErrorHandle("Transaction not found", 404));

  tx.status = "refunded";
  await tx.save();

  res.status(200).json({ success: true, message: "Refund processed", tx });
});
