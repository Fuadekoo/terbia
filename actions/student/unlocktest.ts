"use server";
import sendMessage from "@/bot";
import prisma from "@/lib/db";

export async function unlockTest(
  wdt_ID: number,
  courseId: string,
  chapterId: string
) {
  // check in studentprogresss this chapter is unlocked for this student
  const DisAbleUnlock = await prisma.studentProgress.findFirst({
    where: {
      student: { wdt_ID: wdt_ID },
      chapterId: chapterId,
      isCompleted: true,
    },
  });
  if (DisAbleUnlock) {
    return {
      error: true,
      message: "This chapter is already completed and cannot be unlocked again.",
    };
  }

  // Get student data with courses and ordered chapters
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
              chapters: {
                select: {
                  id: true,
                  title: true,
                  position: true,
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

  if (!student?.activePackage?.courses?.length) {
    return { completed: true, message: "No courses " };
  }

  // Get completed chapter IDs
  const currentStudentProgress = await prisma.studentProgress.findMany({
    where: {
      studentId: student?.wdt_ID,
      chapter: { course: { packageId: student?.activePackage?.id } },
    },
    select: {
      chapterId: true,
      isCompleted: true,
    },
  });

  // Include all chapter progress data, both completed and not completed
  const startedChapterIds = currentStudentProgress.map((p) => p.chapterId);

  // const completedChapterIds = currentStudentProgress
  //   .filter((p) => p.isCompleted)
  //   .map((p) => p.chapterId);

  const incompleteChapterIds = currentStudentProgress
    .filter((p) => p.isCompleted === false)
    .map((p) => p.chapterId);


  if (incompleteChapterIds.includes(chapterId)) {
    // Only run this block if chapterId is in incompleteChapterIds
    console.log("Unlock allowed for chapter:", chapterId);
  } else {
    console.log("unlock fail chapter failed");
  }
  const sample = incompleteChapterIds[0];
  console.log("incompletedchapterid", incompleteChapterIds);
  console.log("chapterid", chapterId);

  // Go course by course, chapter by chapter
  for (const course of student.activePackage.courses) {
    for (const chapter of course.chapters) {
      if (!startedChapterIds.includes(chapter.id)) {
        // This is the first not completed chapter in the current course

        // inthis iwent update the incomplete and add progress for new
        await prisma.$transaction([
          // 1. First operation: Update Chapter 1
          prisma.studentProgress.update({
            where: {
              chapterId: sample,
              studentId_chapterId: {
                studentId: student?.wdt_ID,
                chapterId: sample,
              },
              isCompleted: false,
            },
            data: {
              isCompleted: true,
            },
          }),

          // 2. Second operation: Create Chapter 2
          prisma.studentProgress.create({
            data: {
              studentId: student?.wdt_ID,
              chapterId: chapter.id,
              isCompleted: false,
            },
          }),
        ]);
        

        const result = {
          nextCourseId: course.id,
          nextChapterId: chapter.id,
          status: "incomplete_chapter_found",
          message: "progress is created",
        };
        return result;
      }
    }
    // If all chapters in this course are completed, move to next course
  }

  // If we reach here, all chapters are completed, so update the last incomplete chapter as completed
  if (incompleteChapterIds.length > 0) {
    await prisma.studentProgress.update({
      where: {
        chapterId: incompleteChapterIds[0],
        studentId_chapterId: {
          studentId: student?.wdt_ID,
          chapterId: incompleteChapterIds[0],
        },
        isCompleted: false,
      },
      data: {
        isCompleted: true,
      },
      select: {
        student: {
          select: {
            chat_id: true,
          },
        },
      },
    });
    const congraMessage = `እንኳን ደስ አለዎት! በ"${student?.activePackage?.name}"ፓኬጅ ዉስጥ የሚገኙትን ሁሉንም ኮርሶች ጨርሰዋል፡፡`;
    await sendMessage(Number(), congraMessage);
  }

  // All chapters in all courses are completed
  const result = {
    completed: true,
    message: "All chapters completed",
  };

  console.log("UnlockTest result:", result);
  return result;
}
