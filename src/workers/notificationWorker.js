import notificationQueue from "../queues/notificationQueue.js";
import { User } from "../models/Users.js";
import { io, onlineUsers } from "../server.js"; // import io + map

// Process jobs from queue
notificationQueue.process(async (job, done) => {
  try {
    const { content } = job.data;

    const users = await User.find({
      $or: [
        { Likes: { $exists: true, $ne: [] } },
        { Watchlist: { $exists: true, $ne: [] } },
      ],
    }).populate("Likes Watchlist", "genre");

    let count = 0;

    for (let user of users) {
      const likedGenres = user.Likes?.map((c) => c.genre) || [];
      const watchlistGenres = user.Watchlist?.map((c) => c.genre) || [];
      const allGenres = [...new Set([...likedGenres, ...watchlistGenres])];

      if (allGenres.includes(content.genre)) {
        const notification = {
          content: content._id,
          message: `New ${content.genre} release: ${content.contentTitle}`,
          createdAt: new Date(),
        };

        user.Notifications.push(notification);
        await user.save();

        // 🔥 Real-time push if user is online
        const socket = onlineUsers.get(String(user._id));
        if (socket) {
          socket.emit("notification", notification);
        }

        count++;
      }
    }

    console.log(
      `✅ Notifications sent to ${count} users for ${content.contentTitle}`
    );
    done();
  } catch (error) {
    console.error("❌ Notification job failed:", error);
    done(error);
  }
});

// further use text file for frontend
