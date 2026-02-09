import { NextRequest, NextResponse } from "next/server";
import { getJobStatus } from "@/lib/hls-jobs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const job = getJobStatus(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        baseName: job.baseName,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Error getting job status:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get job status", details: errorMessage },
      { status: 500 },
    );
  }
}
