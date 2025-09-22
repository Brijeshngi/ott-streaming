import express from "express";
import {
  startSubscription,
  verifySubscriptionPayment,
  razorpayWebhook,
} from "../controllers/subscriptionController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/start", isAuthenticated, startSubscription);
router.post("/verify", isAuthenticated, verifySubscriptionPayment);
router.post("/webhook", express.json({ type: "*/*" }), razorpayWebhook);

export default router;
