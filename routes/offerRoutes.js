import express from "express";
import {
  createOffer,
  getAllOffers,
  validateOffer,
  deactivateOffer,
} from "../controllers/offerController.js";

import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Admin
router.post("/", isAuthenticated, createOffer);
router.put("/:id/deactivate", isAuthenticated, deactivateOffer);

// Public/User
router.get("/", getAllOffers);
router.post("/validate", validateOffer);

export default router;
