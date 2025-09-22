import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { apiLimiter, authLimiter } from "./middlewares/rateLimiter.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";

// Import Routes
import userRoutes from "./routes/userRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import adRoutes from "./routes/adRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import watchRoutes from "./routes/watchRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();

// swaggerUi
import swaggerUi from "swagger-ui-express";
import fs from "fs";

const swaggerDocument = JSON.parse(fs.readFileSync("./swagger.json", "utf8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//
app.use("/api/", apiLimiter); // applies to all APIs

// 🔹 Middleware
//
app.use(helmet()); // security headers
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Morgan HTTP logging -> Winston
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

//
// 🔹 Routes
//
app.get("/", (req, res) => {
  res.json({ message: "🚀 CineStream API is running" });
});

app.use("/api/v1/users", authLimiter, userRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/offers", offerRoutes);
app.use("/api/v1/ads", adRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/watch", watchRoutes);
app.use("/api/v1/reviews", reviewRoutes);

//
// 🔹 Error Handler (last middleware)
//
app.use(errorHandler);

export default app;
