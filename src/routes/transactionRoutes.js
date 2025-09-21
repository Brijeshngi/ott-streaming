import express from "express";
import {
  getAllTransactions,
  getUserTransactions,
  getTransactionById,
  refundTransaction,
} from "../controllers/transactionController.js";

import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Admin
router.get("/", isAuthenticated, getAllTransactions);
router.post("/refund", isAuthenticated, refundTransaction);

// User
router.get("/my", isAuthenticated, getUserTransactions);
router.get("/:id", isAuthenticated, getTransactionById);

export default router;
