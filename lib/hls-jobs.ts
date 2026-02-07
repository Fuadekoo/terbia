import crypto from "crypto";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const COURSE_DIR = path.join(UPLOAD_DIR, "videos");
const JOBS_DIR = path.join(UPLOAD_DIR, "jobs");

type HlsJobStatus = "pending" | "processing" | "completed" | "failed";

export interface HlsJob {
  id: string;
  videoPath: string;
  outputDir: string;
  manifestPath: string;
  baseName: string;
  status: HlsJobStatus;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const writeJob = (job: HlsJob) => {
  ensureDir(JOBS_DIR);
  const filePath = path.join(JOBS_DIR, `${job.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(job, null, 2));
};

export const getJobStatus = (jobId: string): HlsJob | null => {
  try {
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as HlsJob;
  } catch {
    return null;
  }
};

const updateJob = (jobId: string, patch: Partial<HlsJob>) => {
  const existing = getJobStatus(jobId);
  if (!existing) return null;
  const updated: HlsJob = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  writeJob(updated);
  return updated;
};

export const createHlsJob = (videoPath: string, baseName: string): HlsJob => {
  ensureDir(UPLOAD_DIR);
  ensureDir(COURSE_DIR);
  ensureDir(JOBS_DIR);

  const outputDir = path.join(COURSE_DIR, baseName);
  const manifestPath = path.join(outputDir, `${baseName}.m3u8`);
  const job: HlsJob = {
    id: crypto.randomUUID(),
    videoPath,
    outputDir,
    manifestPath,
    baseName,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  writeJob(job);
  return job;
};

export const startHlsJob = (job: HlsJob) => {
  try {
    updateJob(job.id, { status: "processing" });

    ensureDir(job.outputDir);

    const segmentPattern = `${job.baseName}_v%v_%03d.ts`;
    const variantPlaylist = `${job.baseName}_v%v.m3u8`;

    const args = [
      "-y",
      "-i",
      job.videoPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0",
      "-map",
      "0:v:0",
      "-map",
      "0:a:0",
      "-map",
      "0:v:0",
      "-map",
      "0:a:0",
      "-c:v:0",
      "libx264",
      "-b:v:0",
      "250k",
      "-s:v:0",
      "256x144",
      "-c:v:1",
      "libx264",
      "-b:v:1",
      "800k",
      "-s:v:1",
      "854x480",
      "-c:v:2",
      "libx264",
      "-b:v:2",
      "5000k",
      "-s:v:2",
      "1920x1080",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-hls_time",
      "4",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_filename",
      segmentPattern,
      "-master_pl_name",
      `${job.baseName}.m3u8`,
      "-var_stream_map",
      "v:0,a:0 v:1,a:1 v:2,a:2",
      variantPlaylist,
    ];

    const proc = spawn("ffmpeg", args, {
      stdio: "ignore",
      cwd: job.outputDir,
    });

    proc.on("error", (error) => {
      updateJob(job.id, {
        status: "failed",
        error: `ffmpeg failed to start: ${error.message}`,
      });
    });

    proc.on("exit", (code) => {
      if (code !== 0) {
        updateJob(job.id, {
          status: "failed",
          error: `ffmpeg exited with code: ${code}`,
        });
        return;
      }

      if (fs.existsSync(job.manifestPath)) {
        updateJob(job.id, { status: "completed" });
        return;
      }

      updateJob(job.id, {
        status: "failed",
        error: "HLS manifest was not created",
      });
    });
  } catch (error) {
    updateJob(job.id, {
      status: "failed",
      error: (error as Error).message,
    });
  }
};
