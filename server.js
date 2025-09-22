import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";
dotenv.config();

// Connect Database
connectDB();

import { logger } from "./config/logger.js";
import { createServer } from "http";
import { Server } from "socket.io";
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // in prod, set to frontend domain
    methods: ["GET", "POST"],
  },
});

// Socket authentication (simplified: pass userId in query)
io.use((socket, next) => {
  const userId = socket.handshake.query.userId;
  if (!userId) {
    return next(new Error("User ID is required"));
  }
  socket.userId = userId;
  next();
});

// Store connected users
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`⚡ User connected: ${socket.userId}`);
  onlineUsers.set(socket.userId, socket);

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
    onlineUsers.delete(socket.userId);
  });
});

// Export io & onlineUsers for use in worker
export { io, onlineUsers };

const PORT = process.env.PORT || 5000;
// sudo service redis-server start
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
