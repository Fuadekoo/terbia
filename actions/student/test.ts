"use server";
import prisma from "@/lib/db";
import { checkingUpdateProhibition } from "./finalExamResult";
import { correctExamAnswer } from "./question";

// Get the chapter and questions for a student in their active package, based on given courseId and chapterId
export async function getQuestionForActivePackageChapterUpdate(
  wdt_ID: number,
  courseid: string,
  chapterId: string
) {
  // 1. Get student and active package with courses and chapters
  const student = await prisma.wpos_wpdatatable_23.findFirst({
    where: {
      wdt_ID: wdt_ID,
      status: { in: ["Active", "Not yet", "On progress", "terbia"] },
    },
    select: {
      wdt_ID: true,
      activePackage: {
        select: {
          id: true,
          name: true,
          courses: {
            select: {
              id: true,
              title: true,
              order: true,
              chapters: {
                select: {
                  id: true,
                  title: true,
                  position: true,
                  videoUrl: true,
                  customVideo: true,

                  // isPublished: true,
                },
                orderBy: { position: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!student || !student.activePackage) {
    throw new Error("Student or active package not found.");
  }

  // 2. Find the course and chapter by the given IDs
  const course = student.activePackage.courses.find((c) => c.id === courseid);
  if (!course) {
    return {
      error: true,
      message: `በፓኬጁ ዉስጥ የሚገኙትን ኮርሶችን ጨርሰዋል፡:በመቀጠል የሚመጣለዎትን ማጠቃለያ ፈተና ይውሰዱ፡፡`,
    };
  }

  const chapter = course.chapters.find((ch) => ch.id === chapterId);
  if (!chapter) {
    return { error: true, message: "ክፍል በዚህ ኮርስ ውስጥ አልተገኘም።" };
  }

  // 3. Get all student progress for this package
  const studentProgress = await prisma.studentProgress.findMany({
    where: {
      student: { wdt_ID: wdt_ID },
      chapter: {
        course: { packageId: student.activePackage.id },
      },
    },
    select: { chapterId: true },
  });
  const completedChapterIds = studentProgress.map((p) => p.chapterId);

  // 4. Get full chapter data and questions
  const chapterData = await prisma.chapter.findUnique({
    where: { id: chapter.id },
    select: {
      id: true,
      title: true,
      description: true,
      videoUrl: true,
      customVideo: true,
      position: true,
      questions: {
        select: {
          id: true,
          question: true,
          questionOptions: { select: { id: true, option: true } },
        },
      },
    },
  });

  // 5. Calculate package progress (doneChapters/totalChapters)
  const allChapters = student.activePackage.courses.flatMap((course) =>
    course.chapters.map((ch) => ch.id)
  );
  const totalChapters = allChapters.length;
  const doneChapters = completedChapterIds.length;

  const data = {
    packageId: student.activePackage.id,
    packageName: student.activePackage.name,
    packageProgress: `${doneChapters}/${totalChapters}`,
    courseId: course.id,
    courseTitle: course.title,
    chapter: chapterData,
  };
  // console.log(data); // Removed this line
  return data;
}

export async function getQuestionForActivePackageFinalExam(
  wdt_ID: number,
  coursesPackageId: string
) {
  // 1. Get student and active package with courses and chapters
  const student = await prisma.wpos_wpdatatable_23.findFirst({
    where: {
      wdt_ID: wdt_ID,
      status: { in: ["Active", "Not yet", "On progress", "terbia"] },
    },
    select: {
      wdt_ID: true,
      activePackage: {
        select: {
          id: true,
          name: true,
          courses: {
            select: {
              id: true,
              title: true,
              order: true,
              chapters: {
                select: {
                  id: true,
                  title: true,
                  position: true,
                  videoUrl: true,
                  // isPublished: true,
                },
                orderBy: { position: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!student || !student.activePackage) {
    throw new Error("Student or active package not found.");
  }

  // 3. Get all student progress for this package
  const studentProgress = await prisma.studentProgress.findMany({
    where: {
      student: { wdt_ID: wdt_ID },
      chapter: {
        course: { packageId: student.activePackage.id },
      },
    },
    select: { isCompleted: true },
  });
  const completedChapters = studentProgress.filter((p) => p.isCompleted);

  // 5. Calculate package progress (doneChapters/totalChapters)
  const allChapterIds =
    student?.activePackage?.courses
      ?.map((c) => c.chapters.map((ch) => ch.id))
      ?.reduce((acc, cc) => [...acc, ...cc], []) ?? [];
  const totalChapters = allChapterIds.length;
  const doneChapters = completedChapters.length;
  if (doneChapters / totalChapters === 1) {
    // 4. Get full chapter data and questions
    const coursesPackageData = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
      select: {
        id: true,
        name: true,
        examDurationMinutes: true,
        questions: {
          select: {
            id: true,
            question: true,
            questionOptions: { select: { id: true, option: true } },
          },
        },
      },
    });

    const data = {
      packageId: student.activePackage.id,
      packageName: student.activePackage.name,
      coursesPackage: coursesPackageData,
      updateProhibition: await checkingUpdateProhibition(
        student.wdt_ID,
        student.activePackage.id
      ),
      answerCorrection: await correctExamAnswer(
        student.activePackage.id,
        student.wdt_ID
      ),
    };
    // console.log(data); // Removed this line

    return data;
  } else {
    return undefined;
  }
}
