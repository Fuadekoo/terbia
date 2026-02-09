import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeVideoFilePath, signVideoToken } from "@/actions/api/video";

const EXPIRES_IN = 300; // 5 minutes

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.status(405).end("Method Not Allowed");
      return;
    }

    const { file } = req.body || {};
    if (!file || typeof file !== "string") {
      res.status(400).json({ error: "Invalid file parameter" });
      return;
    }

    if (file.startsWith("http://") || file.startsWith("https://")) {
      console.error("[Video Token] External URL rejected:", file);
      res.status(400).json({
        error:
          "External URLs are not supported. Tokens are only generated for local files.",
      });
      return;
    }

    if (file.startsWith("blob:")) {
      console.error("[Video Token] Blob URL rejected:", file);
      res.status(400).json({
        error: "Blob URLs are not supported. Use the blob URL directly.",
      });
      return;
    }

    // TODO: Add authentication check here
    // Verify user has access to this video

    const normalizedFile = normalizeVideoFilePath(file);
    const { token } = signVideoToken(normalizedFile, EXPIRES_IN);
    const url = `/api/stream?file=${encodeURIComponent(
      normalizedFile,
    )}&token=${encodeURIComponent(token)}`;

    res.status(200).json({ token, url, expiresIn: EXPIRES_IN });
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
