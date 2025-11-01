import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { wdt_ID: string } }
) {
  try {
    const wdt_ID = parseInt(params.wdt_ID);

    if (isNaN(wdt_ID)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      );
    }

    // Get student data with active package
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        wdt_ID: wdt_ID,
        status: { in: ["Active", "Not yet", "On progress"] },
      },
      select: {
        wdt_ID: true,
        name: true,
        subject: true,
        package: true,
        isKid: true,
        activePackage: {
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            courses: {
              where: { order: 1 },
              select: {
                id: true,
                title: true,
                chapters: {
                  where: { position: 1 },
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found or inactive" },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Error fetching student data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
