"use server";

import prisma from "@/lib/db";
import { FINAL_EXAM_SEGMENT } from "@/lib/utils";

export async function noProgress(
  wdt_ID: number,
  courseId: string
): Promise<boolean> {
  try {
    // Retrieve the packageId associated with the course
    const course = await prisma.course.findFirst({
      where: { id: courseId },
      select: { packageId: true },
    });

    if (!course?.packageId) {
      console.warn(
        `Course not found or missing packageId for courseId: ${courseId}`
      );
      return false;
    }

    // Count student progress within the package
    const progressCount = await prisma.studentProgress.count({
      where: {
        student: { wdt_ID },
        chapter: { course: { packageId: course.packageId } },
      },
    });

    const hasNoProgress = progressCount === 0;
    console.log(
      `Student ${wdt_ID} has no progress in package ${course.packageId}:`,
      hasNoProgress
    );

    return hasNoProgress;
  } catch (error) {
    console.error(
      `Error checking progress for student ${wdt_ID} and course ${courseId}:`,
      error
    );
    return false; // fallback to false in case of error
  }
}

export async function getStudentProgressPerChapter(
  chapterId: string,
  wdt_ID: number
) {
  const progress = await prisma.studentProgress.findFirst({
    where: {
      chapterId: chapterId,
      student: { wdt_ID: wdt_ID },
    },
    select: {
      isCompleted: true,
    },
  });
  return progress;
}
export async function isCompletedAllChaptersInthePackage(
  packageId: string,
  wdt_ID: number
) {
  const studentwithActivePacage = await prisma.wpos_wpdatatable_23.findFirst({
    where: {
      // See note above: identified by wdt_ID (+ the package being asked about),
      // not by status.
      wdt_ID: wdt_ID,
      youtubeSubject: packageId,
    },
    select: {
      wdt_ID: true,
      activePackage: {
        select: {
          id: true,
          name: true,
          courses: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              chapters: {
                orderBy: { position: "asc" },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
  const allChapterIds =
    studentwithActivePacage?.activePackage?.courses
      ?.map((c) => c.chapters.map((ch) => ch.id))
      ?.reduce((acc, cc) => [...acc, ...cc], []) ?? [];

  const progress = await prisma.studentProgress.findMany({
    where: {
      studentId: wdt_ID,
      chapterId: { in: allChapterIds },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      isCompleted: true,
      chapter: {
        select: {
          id: true,
          course: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  if (progress.filter((p) => p.isCompleted).length === allChapterIds.length) {
    return true;
  } else {
    return false;
  }
}

export async function getActivePackageProgress(wdt_ID: number) {
  try {
    // Fetch student with active package, courses, and chapters
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        // Identified by wdt_ID only — see note in isCompletedAllChaptersInthePackage.
        // Gating on status made this return null for students outside the
        // "Active/Not yet/On progress/terbia" set, so their progress path could
        // not be computed even though the link had already granted them access.
        wdt_ID: wdt_ID,
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
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!student || !student.activePackage) {
      return null;
    }

    // Count total chapters in all courses
    const totalChapters = student.activePackage.courses.reduce(
      (sum, course) => sum + course.chapters.length,
      0
    );

    // Get all chapter IDs in the package
    const chapterIds = student.activePackage.courses.flatMap((course) =>
      course.chapters.map((chapter) => chapter.id)
    );

    // Count completed chapters for this student
    const completedChapters = await prisma.studentProgress.count({
      where: {
        studentId: student.wdt_ID,
        chapterId: { in: chapterIds },
        isCompleted: true,
      },
    });

    const progress = { totalChapters, completedChapters };
    return progress;
  } catch (error) {
    console.error("Error in getActivePackageProgress:", error);
    return null;
  }
}

export async function updatePathProgressData(wdt_ID: number) {
  try {
    const studentwithActivePacage = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        // Identified by wdt_ID only — see note in isCompletedAllChaptersInthePackage.
        // Gating on status made this return null for students outside the
        // "Active/Not yet/On progress/terbia" set, so their progress path could
        // not be computed even though the link had already granted them access.
        wdt_ID: wdt_ID,
      },
      select: {
        wdt_ID: true,
        activePackage: {
          select: {
            id: true,
            name: true,
            courses: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                chapters: {
                  orderBy: { position: "asc" },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    const allChapterIds =
      studentwithActivePacage?.activePackage?.courses
        ?.map((c) => c.chapters.map((ch) => ch.id))
        ?.reduce((acc, cc) => [...acc, ...cc], []) ?? [];

    //Fetch the last chapter progress for the student
    const lastChapter = await prisma.studentProgress.findFirst({
      where: {
        studentId: wdt_ID,
        chapterId: { in: allChapterIds },
        isCompleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        chapter: {
          select: {
            id: true,
            course: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!lastChapter) {
      console.log("message");
      return (await cousefailedsolve(wdt_ID));
    } else {
      console.log("Last chapter progress:", lastChapter);
      return [lastChapter.chapter.course.id, lastChapter.chapter.id];
    }
  } catch (error) {
    console.error("Error fetching last chapter progress:", error);
    throw error;
  }
}
export async function updateStartingProgress(
  wdt_ID: number,
  coursesPackageId: string,
  chapterId: string
) {
  try {
    const studentPackage = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
      select: {
        courses: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            chapters: { orderBy: { position: "asc" }, select: { id: true } },
          },
        },
      },
    });
    if (!studentPackage) {
      throw new Error("Student package not found");
    }
    const allChapterIdsFromPackage =
      studentPackage?.courses
        ?.map((c) => c.chapters.map((ch) => ch.id))
        ?.reduce((acc, cc) => [...acc, ...cc], []) ?? [];
    const idx = allChapterIdsFromPackage.findIndex((c) => c === chapterId);
    if (idx === -1) {
      throw new Error("Chapter not found in the package");
    }
    const existingProgress = await prisma.studentProgress.findMany({
      where: { studentId: wdt_ID, chapterId: { in: allChapterIdsFromPackage } },
      select: { id: true },
    });

    if (existingProgress) {
      const ids = existingProgress.map((exId) => exId.id);
      await prisma.studentProgress.deleteMany({
        where: { id: { in: ids } },
      });
      if (idx === 0) {
        await prisma.studentProgress.create({
          data: {
            studentId: wdt_ID,
            chapterId: allChapterIdsFromPackage[idx],
            isCompleted: false,
          },
        });
      } else {
        for (let id = 0; id < idx; id++) {
          await prisma.studentProgress.create({
            data: {
              studentId: wdt_ID,
              chapterId: allChapterIdsFromPackage[id],
              isCompleted: true,
            },
          });
        }
        await prisma.studentProgress.create({
          data: {
            studentId: wdt_ID,
            chapterId: allChapterIdsFromPackage[idx],
            isCompleted: false,
          },
        });
      }
    } else {
      if (idx === 0) {
        await prisma.studentProgress.create({
          data: {
            studentId: wdt_ID,
            chapterId: allChapterIdsFromPackage[idx],
            isCompleted: false,
          },
        });
      } else {
        for (let id = 0; id < idx; id++) {
          await prisma.studentProgress.create({
            data: {
              studentId: wdt_ID,
              chapterId: allChapterIdsFromPackage[id],
              isCompleted: true,
            },
          });
        }
        await prisma.studentProgress.create({
          data: {
            studentId: wdt_ID,
            chapterId: allChapterIdsFromPackage[idx],
            isCompleted: false,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error fetching last chapter progress:", error);
    throw error;
  }
}

// last chapter progress then i wentt o rerutn thr last courseand chapter
export async function pathProgressData(wdt_ID: number) {
  try {
    let pathData: { chapter: { id: string; course: { id: string } } };

    // Try to get the last chapter progress for the student
    const lastChapter = await prisma.studentProgress.findFirst({
      where: {
        student: { wdt_ID: wdt_ID },
        isCompleted: true,
      },
      orderBy: {
        chapter: {
          createdAt: "desc",
        },
      },
      select: {
        chapter: {
          select: {
            id: true,
            course: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (lastChapter && lastChapter.chapter) {
      pathData = lastChapter;
    } else {
      // If no progress found, get the first course and its first chapter
      const firstCourse = await prisma.course.findFirst({
        where: {
          order: 1,
        },
        select: {
          id: true,
          chapters: {
            where: {
              position: 1,
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (firstCourse && firstCourse.chapters.length > 0) {
        pathData = {
          chapter: {
            id: firstCourse.chapters[0].id,
            course: {
              id: firstCourse.id,
            },
          },
        };
      } else {
        throw new Error("No chapters found for the first course.");
      }
    }

    return pathData;
  } catch (error) {
    console.error("Error fetching last chapter progress:", error);
    throw error;
  }
}

export async function packageCompleted(wdt_ID: number) {
  // Get student data with courses and ordered chapters
  const student = await prisma.wpos_wpdatatable_23.findFirst({
    where: {
      // Identified by wdt_ID only. These functions compute *where a student is*,
      // they do not authorise entry — that is the caller's job, and the student
      // flow deliberately grants access by link regardless of status. Gating on
      // status here made the lookup return null for any student outside the
      // "Active/Not yet/On progress/terbia" set, which silently produced "no
      // progress" instead of their real position.
      wdt_ID: wdt_ID,
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
    return { completed: true, message: "በፓኬጁ ዉስጥ ምንም ኮርስ አልተገኘም" };
  }

  // i went gate all studtentchapter and set in aray
  const allChapters = student.activePackage.courses.flatMap((course) =>
    course.chapters.map((chapter) => chapter.id)
  );

  // Get completed chapter IDs
  const currentStudentProgress = await prisma.studentProgress.findMany({
    where: {
      studentId: student?.wdt_ID,
      chapter: { course: { packageId: student?.activePackage?.id } },
      isCompleted: true,
    },
    select: {
      chapterId: true,
      // isCompleted: true,
    },
  });

  // then i went tto compare  allChapters with currentStudentProgress
  // console.log(bk.length == bk.length && ak.every((v) => bk.includes(v)));
  //  const response = allChapters.length && allChapters.every((v)=> currentStudentProgress.includes(v));
  const completedChapterIds = currentStudentProgress.map(
    (progress) => progress.chapterId
  );
  const response =
    allChapters.length > 0 &&
    allChapters.every((chapterId) => completedChapterIds.includes(chapterId));

  console.log("package is finished", response);
  return response;
}

export async function cousefailedsolve(wdt_ID: number) {
  const studentwithActivePacage = await prisma.wpos_wpdatatable_23.findFirst({
    where: {
      // Identified by wdt_ID only. These functions compute *where a student is*,
      // they do not authorise entry — that is the caller's job, and the student
      // flow deliberately grants access by link regardless of status. Gating on
      // status here made the lookup return null for any student outside the
      // "Active/Not yet/On progress/terbia" set, which silently produced "no
      // progress" instead of their real position.
      wdt_ID: wdt_ID,
    },
    select: {
      wdt_ID: true,
      activePackage: {
        select: {
          id: true,
          name: true,
          courses: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              chapters: {
                orderBy: { position: "asc" },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
  const allChapterIds =
    studentwithActivePacage?.activePackage?.courses
      ?.map((c) => c.chapters.map((ch) => ch.id))
      ?.reduce((acc, cc) => [...acc, ...cc], []) ?? [];

  //Fetch the last chapter progress for the student
  const progress = await prisma.studentProgress.findMany({
    where: {
      studentId: wdt_ID,
      chapterId: { in: allChapterIds },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      isCompleted: true,
      chapter: {
        select: {
          id: true,
          course: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  // A student with no active package (or a package with no chapters) has
  // `allChapterIds.length === 0`, which the equality check below would read as
  // "every chapter is complete" and route to the final exam. Bail out first.
  if (allChapterIds.length === 0) return false;

  if (progress.filter((p) => p.isCompleted).length === allChapterIds.length) {
    const activePackageId = studentwithActivePacage?.activePackage?.id;
    // Without a package id there is no final exam to route to — returning the
    // sentinel anyway produced `/student/<id>/finalexam/undefined`.
    if (!activePackageId) return false;
    return [FINAL_EXAM_SEGMENT, activePackageId];
  } else {
    const CompletedlastChapterId = progress.findLast((p) => p.isCompleted)
      ?.chapter.id;

    let nextChapterId: string | undefined = undefined;
    if (!CompletedlastChapterId) {
      nextChapterId = allChapterIds[0];
    } else {
      const idx = allChapterIds.findIndex((c) => c === CompletedlastChapterId);
      nextChapterId = allChapterIds[idx + 1];
    }
    if (nextChapterId) {
      await prisma.studentProgress.create({
        data: {
          studentId: wdt_ID,
          chapterId: nextChapterId,
          isCompleted: false,
        },
      });

      const lastChapter = await prisma.studentProgress.findFirst({
        where: {
          student: { wdt_ID: wdt_ID },
          chapterId: { in: allChapterIds },
          isCompleted: false,
        },
        select: {
          chapter: {
            select: {
              id: true,
              course: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });
      if (!lastChapter) return false;
      return [lastChapter.chapter.course.id, lastChapter.chapter.id];
    }else{
      return false;
    }
  }
}
