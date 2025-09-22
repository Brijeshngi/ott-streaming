import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

//
// 🔹 Log Format
//
const logFormat = format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

//
// 🔹 Logger Instance
//
export const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    logFormat
  ),
  transports: [
    // ✅ Console (colorized)
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),

    // ✅ Info Logs
    new DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
    }),

    // ✅ Error Logs
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      level: "error",
    }),
  ],
});

//
// 🔹 Handle Crashes
//
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});
