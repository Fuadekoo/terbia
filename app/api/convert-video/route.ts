/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  createHlsJob,
  startHlsJob,
  getAllJobsByBaseName,
  getVideoStorageDir,
} from "@/lib/hls-jobs";

const listVideoFiles = (dir: string) => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir);
  const videoMap = new Map<
    string,
    {
      filename: string;
      baseName: string;
      hasMp4: boolean;
      hasHls: boolean;
      hlsDir: string | null;
      manifestPath: string | null;
    }
  >();

  entries.forEach((entry) => {
    const filePath = path.join(dir, entry);
    if (
      fs.statSync(filePath).isFile() &&
      entry.toLowerCase().endsWith(".mp4") &&
      !entry.includes("_chunks")
    ) {
      const baseName = entry.replace(/\.[^/.]+$/, "");
      const hlsDir = path.join(dir, baseName);
      const manifestPath = path.join(hlsDir, `${baseName}.m3u8`);
      const hasHls = fs.existsSync(manifestPath);

      videoMap.set(baseName, {
        filename: entry,
        baseName,
        hasMp4: true,
        hasHls,
        hlsDir: hasHls ? hlsDir : null,
        manifestPath: hasHls ? manifestPath : null,
      });
    }
  });

  entries.forEach((entry) => {
    const entryPath = path.join(dir, entry);
    if (fs.statSync(entryPath).isDirectory() && !entry.includes("_chunks")) {
      const baseName = entry;
      const manifestPath = path.join(entryPath, `${baseName}.m3u8`);

      if (fs.existsSync(manifestPath)) {
        const existing = videoMap.get(baseName);
        if (existing) {
          existing.hasHls = true;
          existing.hlsDir = entryPath;
          existing.manifestPath = manifestPath;
        } else {
          videoMap.set(baseName, {
            filename: `${baseName}.mp4`,
            baseName,
            hasMp4: false,
            hasHls: true,
            hlsDir: entryPath,
            manifestPath,
          });
        }
      }
    }
  });

  return Array.from(videoMap.values());
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const videoDir = getVideoStorageDir();

    if (!fs.existsSync(videoDir)) {
      return NextResponse.json(
        { error: "Video directory not found" },
        { status: 404 },
      );
    }

    const jobsMap = getAllJobsByBaseName();
    const videos = listVideoFiles(videoDir).map((video) => {
      const isConverted = video.hasHls;
      const job = jobsMap.get(video.baseName);
      let jobStatus:
        | "pending"
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | undefined;
      let jobId: string | undefined;

      if (isConverted) {
        jobStatus = "completed";
        if (job) {
          jobId = job.id;
        }
      } else if (job) {
        jobId = job.id;
        if (job.status === "failed") {
          jobStatus = "failed";
        } else if (job.status === "processing") {
          jobStatus = "processing";
        } else if (job.status === "pending") {
          jobStatus = "pending";
        } else if (job.status === "completed") {
          jobStatus = "processing";
        }
      } else {
        jobStatus = "pending";
      }

      return {
        filename: video.filename,
        baseName: video.baseName,
        isConverted,
        hlsDir: video.hlsDir,
        manifestPath: video.manifestPath,
        jobId,
        status: jobStatus,
      };
    });

    let filtered = videos;
    if (status === "converted") {
      filtered = videos.filter((video) => video.isConverted);
    } else if (status === "pending") {
      filtered = videos.filter((video) => !video.isConverted);
    }

    return NextResponse.json({
      success: true,
      total: videos.length,
      converted: videos.filter((video) => video.isConverted).length,
      pending: videos.filter((video) => !video.isConverted).length,
      files: filtered,
    });
  } catch (error: any) {
    console.error("Error listing videos:", error);
    return NextResponse.json(
      { error: "Failed to list videos", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, convertAll } = body;
    const videoDir = getVideoStorageDir();

    if (!fs.existsSync(videoDir)) {
      return NextResponse.json(
        { error: "Video directory not found" },
        { status: 404 },
      );
    }

    if (convertAll) {
      const files = fs.readdirSync(videoDir).filter((file) => {
        const filePath = path.join(videoDir, file);
        return (
          fs.statSync(filePath).isFile() &&
          file.toLowerCase().endsWith(".mp4") &&
          !file.includes("_chunks")
        );
      });

      const jobs: Array<{ filename: string; jobId: string; status: string }> =
        [];

      for (const file of files) {
        const baseName = file.replace(/\.[^/.]+$/, "");
        const hlsDir = path.join(videoDir, baseName);
        const manifestPath = path.join(hlsDir, `${baseName}.m3u8`);

        if (fs.existsSync(manifestPath)) {
          continue;
        }

        const videoPath = path.join(videoDir, file);
        if (fs.existsSync(videoPath)) {
          try {
            const job = createHlsJob(videoPath, baseName);
            startHlsJob(job);
            jobs.push({
              filename: file,
              jobId: job.id,
              status: "queued",
            });
          } catch (error: any) {
            jobs.push({
              filename: file,
              jobId: "",
              status: `error: ${error.message}`,
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Queued ${jobs.length} file(s) for conversion`,
        jobs,
      });
    }

    if (!filename) {
      return NextResponse.json(
        { error: "Please provide filename or set convertAll to true" },
        { status: 400 },
      );
    }

    const videoPath = path.join(videoDir, filename);
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const baseName = filename.replace(/\.[^/.]+$/, "");
    const hlsDir = path.join(videoDir, baseName);
    const manifestPath = path.join(hlsDir, `${baseName}.m3u8`);

    if (fs.existsSync(manifestPath)) {
      return NextResponse.json({
        success: true,
        message: "File already converted",
        filename,
        isConverted: true,
      });
    }

    const job = createHlsJob(videoPath, baseName);
    startHlsJob(job);

    return NextResponse.json({
      success: true,
      message: "Conversion queued successfully",
      filename,
      jobId: job.id,
      status: "queued",
    });
  } catch (error: any) {
    console.error("Error queueing conversion:", error);
    return NextResponse.json(
      { error: "Failed to queue conversion", details: error.message },
      { status: 500 },
    );
  }
}
