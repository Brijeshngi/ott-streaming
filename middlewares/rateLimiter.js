import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

// 🔹 Redis Client
const redisClient = new Redis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

// 🔹 General API limiter
export const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per IP
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔹 Strict limiter for login/auth
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // only 5 login attempts
  message: {
    success: false,
    message: "Too many login attempts, try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
