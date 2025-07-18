import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request
  //   context: { params: { userId: string } }
) {
  try {
    // Replace with actual userId from context
    const { name } = await req.json();

    const createdCoursePackage = await prisma.coursePackage.create({
      data: {
        name,
      },
    });
    console.log("course : ", createdCoursePackage);
    return NextResponse.json(createdCoursePackage);
  } catch (error) {
    console.error("[COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
