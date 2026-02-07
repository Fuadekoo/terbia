import crypto from "crypto";
import path from "path";
import fs from "fs/promises";

const DEFAULT_TTL_SECONDS = 5 * 60;

function getSecret() {
  const secret = process.env.VIDEO_TOKEN_SECRET;
  if (!secret) {
    throw new Error("VIDEO_TOKEN_SECRET is not set");
  }
  return secret;
}

function getBaseDir() {
  return process.env.VIDEO_STORAGE_DIR || "uploads/videos";
}

function normalizeVideoFilePath(file: string) {
  const normalized = file.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("api/videos/")) {
    return normalized.replace(/^api\/videos\//, "");
  }
  if (normalized.startsWith("uploads/videos/")) {
    return normalized.replace(/^uploads\/videos\//, "");
  }
  return normalized;
}

export function signVideoToken(file: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const secret = getSecret();
  const normalizedFile = normalizeVideoFilePath(file);
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${normalizedFile}:${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return { token: `${exp}.${sig}` };
}

export function verifyVideoToken(file: string, token: string) {
  const secret = getSecret();
  const normalizedFile = normalizeVideoFilePath(file);
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig) return false;
  if (Date.now() / 1000 > exp) return false;

  const isValidForPath = (filePath: string) => {
    const payload = `${filePath}:${exp}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  };

  if (isValidForPath(normalizedFile)) return true;

  // Allow HLS variant playlists/segments to reuse master playlist token.
  // Example: folder/name_v1.m3u8 -> folder/name.m3u8
  const parts = normalizedFile.split("/");
  if (parts.length >= 2) {
    const folder = parts[0];
    const masterPath = `${folder}/${folder}.m3u8`;
    if (isValidForPath(masterPath)) return true;
  }

  return false;
}

export function resolveVideoPath(file: string) {
  const baseDir = getBaseDir();
  const normalizedFile = normalizeVideoFilePath(file);
  const safePath = normalizedFile.replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(process.cwd(), baseDir, safePath);
}

export { normalizeVideoFilePath };

export async function fileExists(fullPath: string) {
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

export function getContentTypeByExt(ext: string) {
  switch (ext) {
    case ".m3u8":
      return "application/vnd.apple.mpegurl";
    case ".ts":
      return "video/mp2t";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    default:
      return "application/octet-stream";
  }
}
