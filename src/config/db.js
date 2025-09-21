import mongoose from "mongoose";

// MongoDB connection function
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || "cinestream",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(
      `✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`
    );
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // exit on failure
  }
};

// Graceful shutdown handling
const gracefulExit = () => {
  mongoose.connection.close(() => {
    console.log("⚠️ MongoDB connection closed through app termination");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulExit).on("SIGTERM", gracefulExit);
