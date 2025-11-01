import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { file } = req.query;

    if (!file || typeof file !== "string") {
      res.status(400).send("Missing or invalid file parameter");
      return;
    }

    const safeFile = path.basename(file);
    const videoPath = path.resolve("./uploads/videos", safeFile);

    if (!fs.existsSync(videoPath)) {
      res.status(404).send("File not found");
      return;
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    // ✅ Safari fix — handle both range and full requests
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4",
      });

      file.pipe(res);
    } else {
      // ✅ Safari fallback — send entire file
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      });

      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error("Stream error:", error);
    res.status(500).send("Internal server error");
  }
}
