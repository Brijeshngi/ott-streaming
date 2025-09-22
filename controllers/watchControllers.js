import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
});

// Add user to active viewers
export const startWatching = async (request, response, next) => {
  const { contentId } = request.body;
  const userId = request.user._id;

  await redis.sadd(`activeViewers:${contentId}`, userId);

  // Broadcast update
  const count = await redis.scard(`activeViewers:${contentId}`);
  request.io.emit(`viewers:${contentId}`, { count });

  response.status(200).json({
    success: true,
    message: "Started watching",
    activeViewers: count,
  });
};

// Remove user from active viewers
export const stopWatching = async (request, response, next) => {
  const { contentId } = request.body;
  const userId = request.user._id;

  await redis.srem(`activeViewers:${contentId}`, userId);

  const count = await redis.scard(`activeViewers:${contentId}`);
  request.io.emit(`viewers:${contentId}`, { count });

  response.status(200).json({
    success: true,
    message: "Stopped watching",
    activeViewers: count,
  });
};

// Get current viewers count
export const getActiveViewers = async (request, response, next) => {
  const { contentId } = request.params;
  const count = await redis.scard(`activeViewers:${contentId}`);

  response.status(200).json({
    success: true,
    activeViewers: count,
  });
};
