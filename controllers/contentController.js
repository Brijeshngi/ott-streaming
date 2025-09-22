import { Content } from "../models/Content.js";
import { processAndUploadVideo } from "../services/videoService.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import ErrorHandle from "../utils/errorHandle.js";
import notificationQueue from "../queues/notificationQueue.js";

// Create content and push notification job
export const createContent = catchAsyncError(
  async (request, response, next) => {
    const { contentTitle, genre, description, accessLevel } = request.body;

    if (!contentTitle || !genre) {
      return next(new ErrorHandle("Please provide title and genre", 400));
    }

    const content = await Content.create({
      contentTitle,
      genre,
      description,
      accessLevel,
    });

    // Push notification job to queue
    await notificationQueue.add({ content });

    response.status(201).json({
      success: true,
      message: "Content created successfully. Notifications queued.",
      content,
    });
  }
);
// In production,run API server and worker as separate services (PM2, Docker, Kubernetes, etc.).
export const getContentDashboard = catchAsyncError(async (req, res, next) => {
  // Featured (manually flagged by admin)
  const featured = await Content.find({ isFeatured: true, status: "published" })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("title bannerImage thumbnail type genres averageRating");

  // Trending (based on views/likes in last 30 days)
  const trending = await Content.find({ isTrending: true, status: "published" })
    .sort({ views: -1, likes: -1 })
    .limit(10)
    .select("title thumbnail type genres views likes");

  // New Releases (last 90 days)
  const newReleases = await Content.find({
    status: "published",
    releaseDate: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  })
    .sort({ releaseDate: -1 })
    .limit(10)
    .select("title thumbnail type genres releaseDate");

  // Top Rated (averageRating >= 4, most reviews)
  const topRated = await Content.find({
    status: "published",
    averageRating: { $gte: 4 },
  })
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(10)
    .select("title thumbnail type genres averageRating totalReviews");

  res.status(200).json({
    success: true,
    dashboard: {
      featured,
      trending,
      newReleases,
      topRated,
    },
  });
});

export const searchContent = catchAsyncError(async (req, res, next) => {
  let { title, genre, language, minRating, year, page, limit } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const skip = (page - 1) * limit;

  const query = { status: "published" };

  // 🔍 Title search
  if (title) {
    query.title = { $regex: title, $options: "i" };
  }

  // 🎭 Genre filter
  if (genre) {
    query.genres = { $in: [genre] };
  }

  // 🌍 Language filter
  if (language) {
    query.availableLanguages = { $in: [language] };
  }

  // ⭐ Minimum rating
  if (minRating) {
    query.averageRating = { $gte: Number(minRating) };
  }

  // 📅 Release year
  if (year) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);
    query.releaseDate = { $gte: start, $lte: end };
  }

  // Fetch content
  const contents = await Content.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ releaseDate: -1 })
    .select("title thumbnail type genres language averageRating releaseDate");

  const total = await Content.countDocuments(query);

  res.status(200).json({
    success: true,
    page,
    totalPages: Math.ceil(total / limit),
    totalResults: total,
    results: contents,
  });
});
// Search by Title

// GET /api/v1/content/search?title=dark

// Filter by Genre + Language

// GET /api/v1/content/search?genre=Action&language=Hindi

// Filter by Rating + Year

// GET /api/v1/content/search?minRating=4&year=2025

// Paginated

// GET /api/v1/content/search?page=2&limit=20/

//
// 🔹 Upload Video
//
export const uploadContent = catchAsyncError(async (req, res, next) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No video file uploaded" });
  }

  const { title, description, type, genres, language } = req.body;

  // Process video with multi-bitrate HLS
  const processed = await processAndUploadVideo(
    req.file.path,
    req.file.filename
  );

  // Save in DB
  const content = await Content.create({
    title,
    description,
    type,
    genres,
    language,
    storage: {
      videoUrl: processed.hlsUrl,
      resolutions: processed.resolutions,
      drmProtected: false,
    },
  });

  res.status(201).json({
    success: true,
    message: "Content uploaded successfully",
    content,
  });
});
//
// 🔹 Stream Video
// //<video
//   controls
//   autoPlay
//   src="https://YOUR_CLOUDFRONT_DOMAIN/hls/movie123/movie123.m3u8"
//   type="application/x-mpegURL"
// />

export const streamContent = catchAsyncError(async (req, res, next) => {
  const { key } = req.params; // e.g. videos/movie.mp4
  const s3 = new AWS.S3();

  const range = req.headers.range;
  if (!range) {
    return res.status(400).send("Requires Range header");
  }

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  const head = await s3.headObject(params).promise();
  const fileSize = head.ContentLength;

  const CHUNK_SIZE = 10 ** 6; // 1MB
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + CHUNK_SIZE, fileSize - 1);

  const stream = s3
    .getObject({
      ...params,
      Range: `bytes=${start}-${end}`,
    })
    .createReadStream();

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Type": "video/mp4",
  });

  stream.pipe(res);
});

export const generateEncryptedHLS = (inputPath, outputDir, baseName) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Create encryption key file
    const keyFile = path.join(outputDir, "enc.key");
    const keyInfoFile = path.join(outputDir, "enc.keyinfo");

    // Generate random key
    const key = crypto.randomBytes(16);
    fs.writeFileSync(keyFile, key);

    // Key URI (what player uses to request license)
    const keyUri = `${process.env.CDN_DOMAIN}/hls/${baseName}/enc.key`;

    fs.writeFileSync(keyInfoFile, `${keyUri}\n${keyFile}\n${keyFile}`);

    ffmpeg(inputPath)
      .addOptions([
        "-profile:v baseline",
        "-level 3.0",
        "-hls_time 10",
        "-hls_list_size 0",
        "-hls_key_info_file",
        keyInfoFile,
        "-f hls",
      ])
      .output(path.join(outputDir, `${baseName}.m3u8`))
      .on("end", () => resolve(outputDir))
      .on("error", reject)
      .run();
  });
};
