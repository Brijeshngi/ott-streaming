import jwt from "jsonwebtoken";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  // For AWS ElastiCache with TLS enabled → add: tls: {}
});

// Generate both tokens
export const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.Role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // short-lived
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" } // long-lived
  );

  return { accessToken, refreshToken };
};

// Save refresh token reference in user document
export const saveRefreshToken = async (user, refreshToken) => {
  user.RefreshTokens = user.RefreshTokens || [];
  user.RefreshTokens.push({ token: refreshToken, createdAt: new Date() });
  await user.save();
};

// Blacklist refresh token on logout
export const blacklistToken = async (token, exp) => {
  await redis.set(`bl_${token}`, true, "EX", exp);
};

// Check if refresh token is blacklisted
export const isBlacklisted = async (token) => {
  return await redis.exists(`bl_${token}`);
};
