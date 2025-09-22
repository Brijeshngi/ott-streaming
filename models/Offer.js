import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g. WELCOME50
    description: { type: String },
    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      required: true,
    },
    discountValue: { type: Number, required: true }, // 100 or 20 (%)

    minAmount: { type: Number, default: 0 }, // minimum spend
    maxDiscount: { type: Number }, // cap for percentage discounts

    applicablePlans: [
      { type: String, enum: ["free", "basic", "super", "premium"] },
    ],

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    usageLimit: { type: Number }, // total times offer can be used
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 }, // times per user

    status: {
      type: String,
      enum: ["active", "expired", "upcoming"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Offer = mongoose.model("Offer", offerSchema);
