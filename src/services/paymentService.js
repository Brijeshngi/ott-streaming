import Razorpay from "razorpay";
import crypto from "crypto";
import { Transaction } from "../models/Transaction.js";
import { Subscription } from "../models/Subscription.js";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🔹 Create Razorpay Order
export const createOrder = async (amount, currency = "INR") => {
  return razorpay.orders.create({
    amount: amount * 100, // in paise
    currency,
    payment_capture: 1,
  });
};

// 🔹 Verify Payment Signature
export const verifyPayment = (orderId, paymentId, signature) => {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");
  return expectedSignature === signature;
};

// 🔹 Verify Razorpay Webhook
export const verifyWebhookSignature = (body, signature) => {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest("hex");
  return expectedSignature === signature;
};

// 🔹 Handle Webhook Event
export const handleRazorpayWebhook = async (event) => {
  const { entity } = event;

  switch (event.event) {
    // ✅ Payment Captured
    case "payment.captured":
      await Transaction.findOneAndUpdate(
        { razorpayPaymentId: entity.id },
        { status: "success" }
      );
      break;

    // ❌ Payment Failed
    case "payment.failed":
      await Transaction.findOneAndUpdate(
        { razorpayOrderId: entity.order_id },
        { status: "failed" }
      );
      break;

    // 💰 Refund Issued
    case "refund.processed":
      await Transaction.findOneAndUpdate(
        { razorpayPaymentId: entity.payment_id },
        { status: "refunded" }
      );
      break;

    // 🔁 Subscription Activated
    case "subscription.activated":
      await Subscription.findOneAndUpdate(
        { razorpaySubscriptionId: entity.id },
        { status: "active" }
      );
      break;

    // ⏸ Subscription Paused
    case "subscription.paused":
      await Subscription.findOneAndUpdate(
        { razorpaySubscriptionId: entity.id },
        { status: "paused" }
      );
      break;

    // ❌ Subscription Cancelled
    case "subscription.cancelled":
      await Subscription.findOneAndUpdate(
        { razorpaySubscriptionId: entity.id },
        { status: "cancelled" }
      );
      break;

    default:
      console.log(`Unhandled Razorpay event: ${event.event}`);
  }
};
