import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Custom log format
const logFormat = format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

export const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }), // capture stack trace
    format.splat(),
    format.json(),
    logFormat
  ),
  transports: [
    // Console output
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),

    // Info logs
    new DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
    }),

    // Error logs
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

// Helper to log uncaught exceptions & rejections
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception: ", err);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection: ", reason);
});
