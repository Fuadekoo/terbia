"use server";
import prisma from "@/lib/db";
import getAttendanceofStudent from "./attendance";
import { checkingUpdateProhibition } from "./finalExamResult";
import { correctExamAnswer } from "./question";

export async function getpackage(wdt_ID: number) {
  const myPackageList = await prisma.studentProgress.findMany({
    where: { student: { wdt_ID: wdt_ID } },
    select: {
      chapter: { 
        select: {
          course: {
            select: {
              _count: { select: { chapters: true } },
              package: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });
  return myPackageList;
}

export async function getstudentId(wdt_ID: number) {
  const studentId = await prisma.wpos_wpdatatable_23.findFirst({
    where: { wdt_ID },
    select: { wdt_ID: true },
  });
  return studentId?.wdt_ID;
}

// export async function studentDashboard(chatId: string) {}

/**
 * Where a chapter sits on the student's path.
 *
 * `current` is the single chapter the student is expected to open next — the
 * first one in package order that is not finished. Everything after it is
 * `locked`, which mirrors the sidebar (`main-menu`) and the chapter layout's
 * progress-driven redirect.
 */
export type DashboardChapterState = "completed" | "current" | "locked";

export type DashboardChapter = {
  id: string;
  title: string;
  position: number;
  state: DashboardChapterState;
  completedAt: string | null;
};

export type DashboardCourse = {
  id: string;
  title: string;
  order: number;
  totalChapters: number;
  completedChapters: number;
  percent: number;
  state: "completed" | "in-progress" | "locked";
  chapters: DashboardChapter[];
};

export type DashboardNextLesson = {
  courseId: string;
  courseTitle: string;
  chapterId: string;
  chapterTitle: string;
  position: number;
  /** True before the student has completed anything — "Start" instead of "Continue". */
  isFirstLesson: boolean;
};

export type DashboardRecentLesson = {
  chapterId: string;
  chapterTitle: string;
  courseId: string;
  courseTitle: string;
  completedAt: string;
};

export type StudentDashboardData = {
  student: {
    wdt_ID: number;
    name: string | null;
    status: string | null;
    subject: string | null;
  };
  activePackage: { id: string; name: string } | null;
  courses: DashboardCourse[];
  stats: {
    totalChapters: number;
    completedChapters: number;
    remainingChapters: number;
    percent: number;
    totalCourses: number;
    completedCourses: number;
  };
  nextLesson: DashboardNextLesson | null;
  finalExam: {
    packageId: string | null;
    unlocked: boolean;
    taken: boolean;
    correct: number | null;
    total: number | null;
    percent: number | null;
  };
  attendance: { present: number; absent: number } | null;
  recent: DashboardRecentLesson[];
};

/**
 * Everything the student dashboard renders, in one round trip.
 *
 * The page used to call `getStudentProgressPerChapter` once per chapter, which
 * is a request per lesson on every load; here the whole package is read once
 * and the progress rows are joined in memory.
 */
export async function getStudentDashboard(
  wdt_ID: number
): Promise<StudentDashboardData | null> {
  if (!wdt_ID || Number.isNaN(wdt_ID)) return null;

  // Identified by wdt_ID only — access is granted by the student link, exactly
  // as in `getPackageData`. Gating on `status` here would blank the dashboard
  // for students whose free-text status sits outside the expected set.
  const student = await prisma.wpos_wpdatatable_23.findFirst({
    where: { wdt_ID },
    select: {
      wdt_ID: true,
      name: true,
      status: true,
      subject: true,
      activePackage: {
        select: {
          id: true,
          name: true,
          courses: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              chapters: {
                orderBy: { position: "asc" },
                select: { id: true, title: true, position: true },
              },
            },
          },
        },
      },
    },
  });

  if (!student) return null;

  const base = {
    student: {
      wdt_ID: student.wdt_ID,
      name: student.name,
      status: student.status,
      subject: student.subject,
    },
    attendance: (await getAttendanceofStudent(wdt_ID)) ?? null,
  };

  if (!student.activePackage) {
    return {
      ...base,
      activePackage: null,
      courses: [],
      stats: {
        totalChapters: 0,
        completedChapters: 0,
        remainingChapters: 0,
        percent: 0,
        totalCourses: 0,
        completedCourses: 0,
      },
      nextLesson: null,
      finalExam: {
        packageId: null,
        unlocked: false,
        taken: false,
        correct: null,
        total: null,
        percent: null,
      },
      recent: [],
    };
  }

  const activePackage = student.activePackage;
  const chapterIds = activePackage.courses.flatMap((course) =>
    course.chapters.map((chapter) => chapter.id)
  );

  const progressRows = chapterIds.length
    ? await prisma.studentProgress.findMany({
        where: { studentId: wdt_ID, chapterId: { in: chapterIds } },
        select: {
          chapterId: true,
          isCompleted: true,
          completedAt: true,
          updatedAt: true,
        },
      })
    : [];

  const progressByChapter = new Map(
    progressRows.map((row) => [row.chapterId, row])
  );

  const chapterLookup = new Map(
    activePackage.courses.flatMap((course) =>
      course.chapters.map(
        (chapter) => [chapter.id, { chapter, course }] as const
      )
    )
  );

  // The first unfinished chapter in package order is the one to continue from;
  // everything past it stays locked.
  const currentChapterId = chapterIds.find(
    (id) => progressByChapter.get(id)?.isCompleted !== true
  );

  const totalChapters = chapterIds.length;
  const completedChapters = chapterIds.filter(
    (id) => progressByChapter.get(id)?.isCompleted === true
  ).length;

  const current = currentChapterId
    ? chapterLookup.get(currentChapterId)
    : undefined;

  const nextLesson: DashboardNextLesson | null = current
    ? {
        courseId: current.course.id,
        courseTitle: current.course.title,
        chapterId: current.chapter.id,
        chapterTitle: current.chapter.title,
        position: current.chapter.position,
        isFirstLesson: completedChapters === 0,
      }
    : null;

  const courses: DashboardCourse[] = activePackage.courses.map((course) => {
    const chapters: DashboardChapter[] = course.chapters.map((chapter) => {
      const row = progressByChapter.get(chapter.id);
      const state: DashboardChapterState =
        row?.isCompleted === true
          ? "completed"
          : chapter.id === currentChapterId
          ? "current"
          : "locked";

      return {
        id: chapter.id,
        title: chapter.title,
        position: chapter.position,
        state,
        completedAt:
          row?.isCompleted === true
            ? (row.completedAt ?? row.updatedAt).toISOString()
            : null,
      };
    });

    const courseCompleted = chapters.filter(
      (chapter) => chapter.state === "completed"
    ).length;
    const courseTotal = chapters.length;

    return {
      id: course.id,
      title: course.title,
      order: course.order,
      totalChapters: courseTotal,
      completedChapters: courseCompleted,
      percent: courseTotal
        ? Math.round((courseCompleted / courseTotal) * 100)
        : 0,
      state:
        courseTotal > 0 && courseCompleted === courseTotal
          ? "completed"
          : courseCompleted > 0 ||
            chapters.some((chapter) => chapter.state === "current")
          ? "in-progress"
          : "locked",
      chapters,
    };
  });

  const packageFinished =
    totalChapters > 0 && completedChapters === totalChapters;

  let examTaken = false;
  let examResult: { correct: number; total: number; score: number } | null = null;

  if (packageFinished) {
    examTaken = await checkingUpdateProhibition(wdt_ID, activePackage.id);
    if (examTaken) {
      try {
        examResult =
          (await correctExamAnswer(activePackage.id, wdt_ID))?.result ?? null;
      } catch (error) {
        // A missing or half-written exam must never take the dashboard down.
        console.error("Failed to read final exam result:", error);
      }
    }
  }

  const recent: DashboardRecentLesson[] = progressRows
    .filter((row) => row.isCompleted && chapterLookup.has(row.chapterId))
    .map((row) => ({ row, at: row.completedAt ?? row.updatedAt }))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5)
    .map(({ row, at }) => {
      const { chapter, course } = chapterLookup.get(row.chapterId)!;
      return {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        courseId: course.id,
        courseTitle: course.title,
        completedAt: at.toISOString(),
      };
    });

  return {
    ...base,
    activePackage: { id: activePackage.id, name: activePackage.name },
    courses,
    stats: {
      totalChapters,
      completedChapters,
      remainingChapters: Math.max(totalChapters - completedChapters, 0),
      percent: totalChapters
        ? Math.round((completedChapters / totalChapters) * 100)
        : 0,
      totalCourses: courses.length,
      completedCourses: courses.filter((course) => course.state === "completed")
        .length,
    },
    nextLesson,
    finalExam: {
      packageId: activePackage.id,
      unlocked: packageFinished,
      taken: examTaken,
      correct: examResult?.correct ?? null,
      total: examResult?.total ?? null,
      percent: examResult ? Math.round(examResult.score * 100) : null,
    },
    recent,
  };
}
