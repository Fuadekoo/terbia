"use server";

import { writeFile, mkdir, readFile, rm } from "fs/promises";
import fs from "fs";
import { join } from "path";
import { createHlsJob, startHlsJob } from "@/lib/hls-jobs";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const COURSE_DIR = join(UPLOAD_DIR, "videos");

const queueHlsConversion = (videoPath: string, baseName: string) => {
  if (!fs.existsSync(videoPath)) return null;
  const job = createHlsJob(videoPath, baseName);
  startHlsJob(job);
  return job;
};

function getTimestampUUID(ext: string) {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;
}

export interface VideoUploadResult {
  success: boolean;
  filename?: string;
  jobId?: string;
  error?: string;
}

// Upload video chunk
export async function uploadVideoChunk(
  chunk: File,
  filename: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<VideoUploadResult> {
  try {
    if (!chunk) {
      return { success: false, error: "Chunk file missing" };
    }

    let finalFilename = filename;
    if (!finalFilename || finalFilename === "") {
      const ext = chunk.name.split(".").pop() || "mp4";
      finalFilename = getTimestampUUID(ext);
    }

    const chunkFolder = join(
      COURSE_DIR,
      finalFilename.replace(/\.[^/.]+$/, "") + "_chunks",
    );

    // Ensure chunk folder exists
    await mkdir(chunkFolder, { recursive: true });

    const chunkPath = join(chunkFolder, `chunk_${chunkIndex}`);
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
    await writeFile(chunkPath, chunkBuffer);

    // If this is the last chunk, combine them
    if (chunkIndex + 1 === totalChunks) {
      const baseName = finalFilename.replace(/\.[^/.]+$/, "");
      const videoPath = join(COURSE_DIR, `${baseName}.mp4`);

      try {
        const chunks = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunkFilePath = join(chunkFolder, `chunk_${i}`);
          try {
            const chunkData = await readFile(chunkFilePath);
            chunks.push(chunkData);
          } catch {
            // Skip missing chunks
            continue;
          }
        }

        const finalBuffer = Buffer.concat(chunks);
        await writeFile(videoPath, finalBuffer);
        await rm(chunkFolder, { recursive: true, force: true });

        const job = queueHlsConversion(videoPath, baseName);

        return {
          success: true,
          filename: `${baseName}.mp4`,
          jobId: job?.id,
        };
      } catch (err) {
        console.error("Error joining chunks:", err);
        return { success: false, error: "Error joining chunks" };
      }
    }

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "Upload failed" };
  }
}

// Upload complete video file (for smaller files)
export async function uploadVideoFile(
  file: File,
  filename?: string,
): Promise<VideoUploadResult> {
  try {
    if (!file) {
      return { success: false, error: "File missing" };
    }

    let finalFilename = filename;
    if (!finalFilename || finalFilename === "") {
      const ext = file.name.split(".").pop() || "mp4";
      finalFilename = getTimestampUUID(ext);
    }

    // Validate file size (max 100MB for direct upload)
    if (file.size > 100 * 1024 * 1024) {
      return {
        success: false,
        error:
          "File too large. Use chunked upload for files larger than 100MB.",
      };
    }

    const videoPath = join(COURSE_DIR, finalFilename);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(videoPath, fileBuffer);

    const baseName = finalFilename.replace(/\.[^/.]+$/, "");
    const job = queueHlsConversion(videoPath, baseName);

    return { success: true, filename: finalFilename, jobId: job?.id };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "Upload failed" };
  }
}

// Delete video file
export async function deleteVideoFile(
  filename: string,
): Promise<VideoUploadResult> {
  try {
    if (!filename) {
      return { success: false, error: "Filename is required" };
    }

    const videoPath = join(COURSE_DIR, filename);
    await rm(videoPath, { force: true });

    return { success: true, filename };
  } catch (error) {
    console.error("Delete error:", error);
    return { success: false, error: "Failed to delete video" };
  }
}

// List uploaded videos
export async function listUploadedVideos(): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
}> {
  try {
    const { readdir } = await import("fs/promises");

    try {
      const files = await readdir(COURSE_DIR);
      const videoExtensions = [".mp4", ".avi", ".mov", ".webm", ".mkv", ".flv"];
      return {
        success: true,
        data: files.filter(
          (file) =>
            videoExtensions.some((ext) => file.toLowerCase().endsWith(ext)) &&
            !file.startsWith("."),
        ),
      };
    } catch {
      return {
        success: true,
        data: [],
      };
    }
  } catch (error) {
    console.error("Error listing videos:", error);
    return { success: false, error: "Failed to list videos" };
  }
}
