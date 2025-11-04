import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { packageId: string } }
) {
  try {
    const { packageId } = params;

    if (!packageId) {
      return NextResponse.json(
        { error: "Package ID is required" },
        { status: 400 }
      );
    }

    // Check if the package has any questions (final exam)
    const packageData = await prisma.coursePackage.findUnique({
      where: { id: packageId },
      select: {
        questions: {
          select: { id: true },
          take: 1, // Only need to check if at least one exists
        },
      },
    });

    const hasFinalExam = (packageData?.questions?.length ?? 0) > 0;

    return NextResponse.json({
      hasFinalExam,
      packageId,
    });
  } catch (error) {
    console.error("Error checking final exam:", error);
    return NextResponse.json(
      { error: "Failed to check final exam", hasFinalExam: false },
      { status: 500 }
    );
  }
}
