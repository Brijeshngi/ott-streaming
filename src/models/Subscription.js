import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  planType: {
    type: String,
    enum: ["free", "basic", "super", "premium"],
    default: "free",
  },
  duration: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
    default: "monthly",
  },
  startDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  autoRenew: { type: Boolean, default: true },
  paymentProvider: { type: String, enum: ["razorpay", "stripe", "paypal"] },
  transactionId: { type: String },
});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
