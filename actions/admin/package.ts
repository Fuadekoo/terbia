"use server";
// import { auth } from "@/auth";
import prisma from "@/lib/db";
// import { isTeacher } from "@/lib/teacher";
// import { redirect } from "next/navigation";

export async function getCoursesPackages() {
  try {
    const coursesPackages = await prisma.coursePackage
      .findMany({
        where: {},
        select: {
          id: true,
          name: true,
          description: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
          examDurationMinutes: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      .catch((error) => {
        console.error("ERRRO >> ", error);
        return [];
      });
    console.log("courses package: ", coursesPackages);
    return coursesPackages;
  } catch (error) {
    console.error("Error fetching courses with progress:", error);
    return [];
  }
}
export async function getCoursesPackageId(wdt_ID: number) {
  try {
    const youtubeSubjec = await prisma.wpos_wpdatatable_23.findFirst({
      where: { wdt_ID },
      select: { youtubeSubject: true },
    });
    console.log("courses package: ", youtubeSubjec?.youtubeSubject);
    return youtubeSubjec?.youtubeSubject;
  } catch (error) {
    console.error("Error fetching courses with progress:", error);
    return null;
  }
}
