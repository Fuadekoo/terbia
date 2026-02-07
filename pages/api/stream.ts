import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import {
  verifyVideoToken,
  resolveVideoPath,
  fileExists,
  getContentTypeByExt,
} from "@/actions/api/video";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { file, token } = req.query;

    if (
      !file ||
      !token ||
      typeof file !== "string" ||
      typeof token !== "string"
    ) {
      console.error("[Stream] Missing file/token", { file, token });
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // TODO: Add authentication check here
    // Verify user has access to this video

    if (!verifyVideoToken(file, token)) {
      console.error("[Stream] Invalid token", { file });
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const fullPath = resolveVideoPath(file);
    if (!(await fileExists(fullPath))) {
      console.error("[Stream] File not found", { fullPath });
      res.status(404).json({ error: "Not found" });
      return;
    }

    const stat = fs.statSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = getContentTypeByExt(ext);

    const range = req.headers.range;
    if (range) {
      const [startStr, endStr] = range.replace("bytes=", "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
      });

      fs.createReadStream(fullPath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });

    fs.createReadStream(fullPath).pipe(res);
  } catch (error) {
    console.error("[Stream] Internal error", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
