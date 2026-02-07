"use server";

import fs from "fs";
import path from "path";
import { createHlsJob, startHlsJob } from "@/lib/hls-jobs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const COURSE_DIR = path.join(UPLOAD_DIR, "videos");

const queueHlsConversion = (videoPath: string, baseName: string) => {
  if (!fs.existsSync(videoPath)) return null;
  const job = createHlsJob(videoPath, baseName);
  startHlsJob(job);
  return job;
};

function getTimestampUUID(ext: string) {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;
}

interface UploadResult {
  success: boolean;
  filename?: string;
  jobId?: string;
  error?: string;
}

export async function uploadVideoChunk(
  formData: FormData,
): Promise<UploadResult> {
  try {
    const chunk = formData.get("chunk") as File;
    const filename = formData.get("filename") as string;
    const chunkIndex = formData.get("chunkIndex") as string;
    const totalChunks = formData.get("totalChunks") as string;

    if (!chunk) {
      return { success: false, error: "Chunk file missing" };
    }

    let finalFilename = filename;
    if (!finalFilename || finalFilename === "") {
      const ext = chunk.name.split(".").pop() || "mp4";
      finalFilename = getTimestampUUID(ext);
    }

    const chunkFolder = path.join(
      COURSE_DIR,
      finalFilename.replace(/\.[^/.]+$/, "") + "_chunks",
    );

    if (!fs.existsSync(chunkFolder)) {
      fs.mkdirSync(chunkFolder, { recursive: true });
    }

    const chunkPath = path.join(chunkFolder, `chunk_${chunkIndex}`);
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
    fs.writeFileSync(chunkPath, chunkBuffer);

    if (parseInt(chunkIndex) + 1 === parseInt(totalChunks)) {
      const baseName = finalFilename.replace(/\.[^/.]+$/, "");
      const videoPath = path.join(COURSE_DIR, `${baseName}.mp4`);

      try {
        const chunks = [];
        for (let i = 0; i < parseInt(totalChunks); i++) {
          const chunkFilePath = path.join(chunkFolder, `chunk_${i}`);
          if (fs.existsSync(chunkFilePath)) {
            chunks.push(fs.readFileSync(chunkFilePath));
          }
        }

        const finalBuffer = Buffer.concat(chunks);
        fs.writeFileSync(videoPath, finalBuffer);
        fs.rmSync(chunkFolder, { recursive: true, force: true });

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
