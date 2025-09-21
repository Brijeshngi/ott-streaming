import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    }, // link if it's a sub
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer" }, // applied promo

    amount: { type: Number, required: true }, // charged amount after discount
    currency: { type: String, default: "INR" },

    paymentProvider: {
      type: String,
      enum: ["razorpay", "stripe", "paypal"],
      required: true,
    },
    providerTransactionId: { type: String, required: true }, // Razorpay order_id, Stripe charge_id

    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },

    method: { type: String }, // "card", "upi", "netbanking", "paypal_balance"

    // Refund info
    isRefunded: { type: Boolean, default: false },
    refundId: { type: String }, // provider refund id
    refundReason: { type: String },

    // Offer/discount tracking
    discountApplied: { type: Number, default: 0 }, // discount amount
    originalAmount: { type: Number }, // before discount

    // Metadata for reconciliation
    providerResponse: { type: Object }, // raw provider payload
    invoiceUrl: { type: String }, // invoice PDF url if generated

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
