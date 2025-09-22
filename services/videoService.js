import ffmpeg from "fluent-ffmpeg";
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

// 🔹 Upload to S3
const uploadToS3 = (filePath, key, mimeType) => {
  const fileStream = fs.createReadStream(filePath);
  return s3
    .upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: mimeType,
    })
    .promise();
};

// 🔹 Multi-bitrate HLS generation
export const generateMultiBitrateHLS = (inputPath, outputDir, baseName) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    ffmpeg(inputPath)
      .addOptions([
        "-profile:v baseline", // compatibility
        "-level 3.0",
        "-start_number 0",
        "-hls_time 10", // 10s chunks
        "-hls_list_size 0",
        "-f hls",
      ])
      // 480p
      .output(path.join(outputDir, "480p.m3u8"))
      .videoCodec("libx264")
      .audioCodec("aac")
      .size("854x480")
      .outputOptions([
        "-hls_segment_filename",
        path.join(outputDir, "480p_%03d.ts"),
      ])
      // 720p
      .output(path.join(outputDir, "720p.m3u8"))
      .videoCodec("libx264")
      .audioCodec("aac")
      .size("1280x720")
      .outputOptions([
        "-hls_segment_filename",
        path.join(outputDir, "720p_%03d.ts"),
      ])
      // 1080p
      .output(path.join(outputDir, "1080p.m3u8"))
      .videoCodec("libx264")
      .audioCodec("aac")
      .size("1920x1080")
      .outputOptions([
        "-hls_segment_filename",
        path.join(outputDir, "1080p_%03d.ts"),
      ])

      .on("end", async () => {
        // Generate master playlist
        const masterPlaylist = `
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8
`;
        fs.writeFileSync(
          path.join(outputDir, `${baseName}.m3u8`),
          masterPlaylist
        );

        resolve(outputDir);
      })
      .on("error", reject)
      .run();
  });
};

// 🔹 Full Video Processing
export const processAndUploadVideo = async (filePath, fileName) => {
  const baseName = fileName.split(".")[0];
  const hlsDir = `uploads/hls/${baseName}`;

  if (!fs.existsSync(hlsDir)) fs.mkdirSync(hlsDir, { recursive: true });

  // Generate multi-bitrate HLS
  await generateMultiBitrateHLS(filePath, hlsDir, baseName);

  // Upload HLS files
  const files = fs.readdirSync(hlsDir);
  for (const f of files) {
    const filePath = path.join(hlsDir, f);
    const mimeType = f.endsWith(".m3u8")
      ? "application/x-mpegURL"
      : "video/MP2T";
    await uploadToS3(filePath, `hls/${baseName}/${f}`, mimeType);
  }

  // Cleanup local files
  fs.unlinkSync(filePath);
  fs.rmSync(hlsDir, { recursive: true, force: true });

  return {
    hlsUrl: `https://${process.env.CLOUDFRONT_DOMAIN}/hls/${baseName}/${baseName}.m3u8`,
    resolutions: ["480p", "720p", "1080p"],
  };
};
