import Bull from "bull";
import { User } from "../models/Users.js";

// Redis connection
const notificationQueue = new Bull("notificationQueue", {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  },
});

export default notificationQueue;
