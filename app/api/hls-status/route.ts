import { NextRequest, NextResponse } from "next/server";
import {
  fileExists,
  normalizeVideoFilePath,
  resolveVideoPath,
} from "@/actions/api/video";
import { getJobStatus } from "@/lib/hls-jobs";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  const file = request.nextUrl.searchParams.get("file");

  if (jobId) {
    const job = getJobStatus(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  }

  if (!file) {
    return NextResponse.json(
      { ready: false, error: "jobId or file is required" },
      { status: 400 },
    );
  }

  const normalized = normalizeVideoFilePath(file);
  const fullPath = resolveVideoPath(normalized);
  const exists = await fileExists(fullPath);

  return NextResponse.json({ ready: exists, file: normalized });
}
