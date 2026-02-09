"use server";
import prisma from "@/lib/db";
import { getActivePackageProgress } from "@/actions/student/progress";
import { correctExamAnswer } from "../student/question";
import {
  checkFinalExamCreation,
  checkingUpdateProhibition,
} from "../student/finalExamResult";
import { getAttendanceofAllStudents } from "../student/attendance";
import { differenceInDays, differenceInCalendarDays } from "date-fns";
import { hasMatchingSubject as originalHasMatchingSubject } from "@/lib/subject-matching";

// Wrapper function to handle null values for subject matching
const hasMatchingSubject = (studentSubjects: string | null | undefined, requiredSubject: string | null): boolean => {
  if (!studentSubjects || !requiredSubject) return false;
  return originalHasMatchingSubject(studentSubjects, requiredSubject);
};

export async function getStudentProgressStatus(
  studentId: number,
  activePackageId: string
) {
  // 1. Get all chapters for the active package
  const chapters = await prisma.chapter.findMany({
    where: { course: { packageId: activePackageId } },
    select: {
      id: true,
      title: true,
      course: { select: { title: true, package: { select: { name: true } } } },
    },
  });
  const chapterIds = chapters.map((ch) => ch.id);

  const progress = await prisma.studentProgress.findMany({
    where: {
      studentId,
      chapterId: { in: chapterIds },
    },
    select: { isCompleted: true, chapterId: true },
  });

  if (progress.length > 0) {
    if (progress.filter((p) => p.isCompleted).length === chapterIds.length) {
      return "completed";
    } else {
      const firstIncomplete = progress.find((p) => !p.isCompleted);
      // Find the chapter details for that id
      const chapter = chapters.find(
        (ch) => ch.id === firstIncomplete?.chapterId
      );
      const chapterTitle = chapter?.title ?? null;
      const courseTitle = chapter?.course?.title ?? null;
      const packageName = chapter?.course?.package?.name ?? null;

      const percent = await getProgressPercent(progress, chapterIds.length);

      return `${packageName} > ${courseTitle} > ${chapterTitle} -> ${percent}%`;
    }
  } else {
    return "notstarted";
  }
}
export async function filterStudentsByPackageandStatus(
  packageId: string,
  status: string
) {
  console.log(
    "Filtering students for package:",
    packageId,
    "with status:",
    status
  );
  // 1. Get all chapters for the package
  const chapters = await prisma.chapter.findMany({
    where: { course: { packageId } },
    select: { id: true },
  });
  const chapterIds = chapters.map((ch) => ch.id);

  // 2. Get all students assigned to this package
  const subjectPackages = await prisma.subjectPackage.findMany({
    where: { packageId },
    select: {
      subject: true,
      packageType: true,
      kidpackage: true,
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });

  // 3. Fetch all students with valid status first
  const allStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      status: { in: ["Active", "Not yet", "On progress"] },
    },
    select: {
      wdt_ID: true,
      chat_id: true,
      subject: true,
      package: true,
      isKid: true,
    },
  });

  // 4. Filter students using hasMatchingSubject for comma-separated subjects
  const students = allStudents.filter((student) => {
    if (!student.subject || !student.package || student.isKid === null) {
      return false;
    }

    // Check if student's subjects match any of the subject packages
    return subjectPackages.some((sp) => {
      const subject = sp.subject;
      if (!subject) return false;
      return sp.packageType === student.package &&
        sp.kidpackage === student.isKid &&
        hasMatchingSubject(student.subject, subject);
    });
  });

  // 5. For each student, check their progress for the chapters in the package
  const filteredChatIds: string[] = [];

  for (const student of students) {
    if (!student.chat_id) continue;
    if (status === "all") {
      filteredChatIds.push(student.chat_id);
      continue;
    }
    // Get all progress records for this student and these chapters
    const progress = await prisma.studentProgress.findMany({
      where: {
        studentId: student.wdt_ID,
        chapterId: { in: chapterIds },
      },
      select: { isCompleted: true, chapterId: true },
    });

    if (!student.chat_id) continue;

    // if thhe pass data is packageid and not start  then return the chat_id of student not start,if t=pass complete then return the chatid of student completed and if onprogress then return the chatid of student in progress
    if (progress.length === 0) {
      if (status === "notstarted") {
        filteredChatIds.push(student.chat_id);
      }
    } else if (
      progress.filter((p) => p.isCompleted).length === chapterIds.length
    ) {
      if (status === "completed") {
        filteredChatIds.push(student.chat_id);
      }
    } else {
      const percent = await getProgressPercent(progress, chapterIds.length);
      if (status === "inprogress_0" && percent == 0) {
        filteredChatIds.push(student.chat_id);
      } else if (status === "inprogress_10" && percent <= 10) {
        filteredChatIds.push(student.chat_id);
      } else if (status === "inprogress_40" && percent > 10 && percent <= 40) {
        filteredChatIds.push(student.chat_id);
      } else if (status === "inprogress_70" && percent > 40 && percent <= 70) {
        filteredChatIds.push(student.chat_id);
      } else if (status === "inprogress_o" && percent > 70) {
        filteredChatIds.push(student.chat_id);
      }
    }
  }

  return filteredChatIds;
}
// All students assigned to a specific package
export async function getStudentsByPackage(
  packageId: string
): Promise<{ chat_id: string | null; wdt_ID: number; name: string | null }[]> {
  // 1. Get all subject packages for this package
  const subjectPackages = await prisma.subjectPackage.findMany({
    where: { packageId },
    select: {
      subject: true,
      packageType: true,
      kidpackage: true,
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });

  // 2. Fetch all students with valid status first
  const allStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      status: { in: ["Active", "Not yet", "On progress"] },
    },
    select: {
      chat_id: true,
      wdt_ID: true,
      name: true,
      subject: true,
      package: true,
      isKid: true,
    },
  });

  // 3. Filter students using hasMatchingSubject for comma-separated subjects
  const students = allStudents.filter((student) => {
    if (!student.subject || !student.package || student.isKid === null) {
      return false;
    }

    // Check if student's subjects match any of the subject packages
    return subjectPackages.some((sp) => {
      const subject = sp.subject;
      if (!subject) return false;
      return sp.packageType === student.package &&
        sp.kidpackage === student.isKid &&
        hasMatchingSubject(student.subject, subject);
    });
  });

  return students.map((student) => {
    return {
      chat_id: student.chat_id,
      wdt_ID: student.wdt_ID,
      name: student.name,
    };
  });
}

// Only the teacher's students within a specific package
export async function getStudentsByPackageAndTeacher(
  packageId: string,
  ustazId: string
): Promise<{ chat_id: string | null; wdt_ID: number; name: string | null }[]> {
  // 1. Get all subject packages for this package
  const subjectPackages = await prisma.subjectPackage.findMany({
    where: { packageId },
    select: {
      subject: true,
      packageType: true,
      kidpackage: true,
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });

  // 2. Fetch all students for this teacher with valid status first
  const allStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      status: { in: ["Active", "Not yet", "On progress"] },
      ustaz: ustazId,
    },
    select: {
      chat_id: true,
      wdt_ID: true,
      name: true,
      subject: true,
      package: true,
      isKid: true,
    },
  });

  // 3. Filter students using hasMatchingSubject for comma-separated subjects
  const students = allStudents.filter((student) => {
    if (!student.subject || !student.package || student.isKid === null) {
      return false;
    }

    // Check if student's subjects match any of the subject packages
    return subjectPackages.some((sp) => {
      const subject = sp.subject;
      if (!subject) return false;
      return sp.packageType === student.package &&
        sp.kidpackage === student.isKid &&
        hasMatchingSubject(student.subject, subject);
    });
  });

  return students.map((student) => {
    return {
      chat_id: student.chat_id,
      wdt_ID: student.wdt_ID,
      name: student.name,
    };
  });
}

export async function getProgressPercent(
  progress: { isCompleted: boolean }[],
  total: number
): Promise<number> {
  if (progress.length === 0) return 0;
  const completed = progress.filter((p) => p.isCompleted).length;
  return Number((completed / total) * 100);
}
export async function filterStudentsByPackageList(packageId: string) {
  console.log("Filtering students for package:", packageId);

  // 1. Get all chapters for the package
  const chapters = await prisma.chapter.findMany({
    where: { course: { packageId } },
    select: { id: true },
  });
  const chapterIds = chapters.map((ch) => ch.id);

  // 2. Get all students assigned to this package
  const subjectPackages = await prisma.subjectPackage.findMany({
    where: { packageId },
    select: {
      subject: true,
      packageType: true,
      kidpackage: true,
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });

  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      status: { in: ["Active", "Not yet","On progress"] },
      OR: subjectPackages.map((sp) => ({
        subject: sp.subject,
        package: sp.packageType,
        isKid: sp.kidpackage,
      })),
    },
    select: {
      wdt_ID: true,
      chat_id: true,
    },
  });

  // 3. For each student, check their progress for the chapters in the package
  const notStartedChatIds: string[] = [];
  const completedChatIds: string[] = [];
  const inProgress0ChatIds: string[] = [];
  const inProgress10ChatIds: string[] = [];
  const inProgress40ChatIds: string[] = [];
  const inProgress70ChatIds: string[] = [];
  const inProgressOtherChatIds: string[] = [];
  for (const student of students) {
    // Get all progress records for this student and these chapters
    const progress = await prisma.studentProgress.findMany({
      where: {
        studentId: student.wdt_ID,
        chapterId: { in: chapterIds },
      },
      select: { isCompleted: true, chapterId: true },
    });

    if (progress.length > 0) {
      if (progress.filter((p) => p.isCompleted).length === chapterIds.length) {
        completedChatIds.push(student.wdt_ID + "");
      } else {
        const percent = await getProgressPercent(progress, chapterIds.length);
        if (percent == 0) inProgress0ChatIds.push(student.wdt_ID + "");
        else if (percent <= 10) inProgress10ChatIds.push(student.wdt_ID + "");
        else if (percent <= 40) inProgress40ChatIds.push(student.wdt_ID + "");
        else if (percent <= 70) inProgress70ChatIds.push(student.wdt_ID + "");
        else inProgressOtherChatIds.push(student.wdt_ID + "");
      }
    } else {
      notStartedChatIds.push(student.wdt_ID.toString());
    }
  }

  // Assign to one object and return
  const result = [
    { status: "notstarted", count: notStartedChatIds.length },
    { status: "inprogress_0", count: inProgress0ChatIds.length },
    { status: "inprogress_10", count: inProgress10ChatIds.length },
    { status: "inprogress_40", count: inProgress40ChatIds.length },
    { status: "inprogress_70", count: inProgress70ChatIds.length },
    { status: "inprogress_o", count: inProgressOtherChatIds.length },
    { status: "completed", count: completedChatIds.length },
    // { status: "total", count: students.length },
  ];

  return result;
}
export async function getAllStudents() {
  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      status: { in: ["Active", "Not yet","On progress"] },
    },
    select: {
      wdt_ID: true,
      name: true,
      phoneno: true,
      isKid: true,
      youtubeSubject: true,
    },
  });

  const studentsWithProgress = await Promise.all(
    students.map(async (student) => {
      const progressData = await getActivePackageProgress(student.wdt_ID);
      const progressStatus = await getStudentProgressStatus(
        student.wdt_ID,
        student.youtubeSubject ?? ""
      );

      return {
        ...student,
        progressStatus, // attach the progress status here
        progressData, // attach the progress data here
      };
    })
  );
  return studentsWithProgress;
}
export async function getAllAssignedCoursePackages() {
  const uniquePackages = await prisma.subjectPackage.findMany({
    distinct: ["packageId"],
    select: {
      packageId: true,
    },
  });

  return uniquePackages.length;
}

export async function getTotalStudentsThatHaveacessthePacakges() {
  const subjectPackages = await prisma.subjectPackage.findMany({
    select: {
      subject: true,
      kidpackage: true,
      packageType: true,
      package: { select: { name: true } },
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });

  // For each group, count matching students and return multidimensional array
  subjectPackages.map((sp) => {
    const packageName = sp.package?.name || "Unknown Package";
    return {
      packageName,
      subject: sp.subject,
      kidpackage: sp.kidpackage,
      packageType: sp.packageType,
    };
  });

  // Now, group by packageName and count total students for each package
  const packageStats: Record<
    string,
    { packageName: string; totalStudents: number }
  > = {};
  let totalStudents = 0;
  await Promise.all(
    subjectPackages.map(async (sp) => {
      const packageName = sp.package?.name || "Unknown Package";
      const studentsCount = await prisma.wpos_wpdatatable_23.count({
        where: {
          status: { in: ["Active", "Not yet","On progress"] },
          subject: sp.subject,
          package: sp.packageType,
          isKid: sp.kidpackage ?? undefined,
        },
      });
      if (!packageStats[packageName]) {
        packageStats[packageName] = { packageName, totalStudents: 0 };
      }
      packageStats[packageName].totalStudents += studentsCount;
      totalStudents += studentsCount;
    })
  );

  return totalStudents;
  // Convert to multidimensional array
}
export async function getThePackagesWhichHasLargestStudent() {
  // Get all unique combinations of subject, kidpackage, and packageType from subjectPackage
  const subjectPackages = await prisma.subjectPackage.findMany({
    select: {
      subject: true,
      kidpackage: true,
      packageType: true,
      package: { select: { name: true } },
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });

  // Group by packageName and count total students for each package
  const packageStats: Record<
    string,
    { packageName: string; totalStudents: number }
  > = {};

  await Promise.all(
    subjectPackages.map(async (sp) => {
      const packageName = sp.package?.name || "Unknown Package";
      const studentsCount = await prisma.wpos_wpdatatable_23.count({
        where: {
          status: { in: ["Active", "Not yet","On progress"] },
          subject: sp.subject,
          package: sp.packageType,
          isKid: sp.kidpackage ?? undefined,
        },
      });
      if (!packageStats[packageName]) {
        packageStats[packageName] = { packageName, totalStudents: 0 };
      }
      packageStats[packageName].totalStudents += studentsCount;
    })
  );

  // Find the package(s) with the largest student count
  const maxCount = Math.max(
    ...Object.values(packageStats).map((p) => p.totalStudents)
  );
  const largestPackages = Object.values(packageStats).filter(
    (p) => p.totalStudents === maxCount
  );

  return largestPackages;
}
// Get all unique combinations of subject, packageType, and kidpackage from subjectPackage
export async function getStudentsGroupedBySubjectKidType() {
  // Get all unique combinations of subject, kidpackage, and packageType from subjectPackage
  const subjectPackages = await prisma.subjectPackage.findMany({
    select: {
      subject: true,
      kidpackage: true,
      packageType: true,
      package: { select: { name: true } },
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });

  // For each group, count matching students and return multidimensional array
  subjectPackages.map((sp) => {
    const packageName = sp.package?.name || "Unknown Package";
    return {
      packageName,
      subject: sp.subject,
      kidpackage: sp.kidpackage,
      packageType: sp.packageType,
    };
  });

  // Now, group by packageName and count total students for each package
  const packageStats: Record<
    string,
    { packageName: string; totalStudents: number }
  > = {};

  await Promise.all(
    subjectPackages.map(async (sp) => {
      const packageName = sp.package?.name || "Unknown Package";
      const studentsCount = await prisma.wpos_wpdatatable_23.count({
        where: {
          status: { in: ["Active", "Not yet","On progress"] },
          subject: sp.subject,
          package: sp.packageType,
          isKid: sp.kidpackage ?? undefined,
        },
      });
      if (!packageStats[packageName]) {
        packageStats[packageName] = { packageName, totalStudents: 0 };
      }
      packageStats[packageName].totalStudents += studentsCount;
    })
  );

  // Convert to multidimensional array
  const multidimensionalArray = Object.values(packageStats);

  return multidimensionalArray;
}

export async function getPackageAnalytics() {
  // 1. Get all course packages
  const packages = await prisma.coursePackage.findMany({
    select: {
      id: true,
      name: true,
      subjectPackages: {
        select: {
          subject: true,
          packageType: true,
          kidpackage: true,
        },
      },
    },
  });

  // 2. For each package, gather analytics
  const analytics = await Promise.all(
    packages.map(async (pkg) => {
      // Get all students assigned to this package via subjectPackage
      const subjectPackages = pkg.subjectPackages;
      
      // 1. Fetch all students with valid status first
      const allStudents = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          status: { in: ["Active", "Not yet", "On progress"] },
        },
        select: {
          wdt_ID: true,
          name: true,
          youtubeSubject: true,
          progress: true,
          subject: true,
          package: true,
          isKid: true,
        },
      });

      // 2. Filter students using hasMatchingSubject for comma-separated subjects
      const assignedStudents = allStudents.filter((student) => {
        if (!student.subject || !student.package || student.isKid === null) {
          return false;
        }

        // Check if student's subjects match any of the subject packages
        return subjectPackages.some((sp) => {
          const subject = sp.subject;
          if (!subject || !sp.packageType || sp.kidpackage === null) return false;
          return sp.packageType === student.package &&
            sp.kidpackage === student.isKid &&
            hasMatchingSubject(student.subject, subject);
        });
      });

      // total Students assigned to this package
      const assignedTotalStudents = assignedStudents.length;

      // // Not started: youtubeSubject is null
      // const notStartedStudents = assignedStudents.filter(
      //   (s) => !s.progress || s.youtubeSubject === null
      // );

      const completedStudents: typeof assignedStudents = [];
      const inProgressStudents: typeof assignedStudents = [];
      const notStartedStudents: typeof assignedStudents = [];

      for (const student of assignedStudents) {
        // Get all chapters in the package
        const allChapters = await prisma.course.findMany({
          where: { packageId: pkg.id },
          select: { chapters: { select: { id: true } } },
        });
        const chapterIds = allChapters.flatMap((c) =>
          c.chapters.map((ch) => ch.id)
        );
        // Get completed chapters for this student
        const completed = await prisma.studentProgress.findMany({
          where: {
            studentId: student.wdt_ID,
            chapterId: { in: chapterIds },
            // isCompleted: true,
          },
        });

        if (completed.length > 0) {
          if (
            completed.filter((p) => p.isCompleted).length === chapterIds.length
          ) {
            completedStudents.push(student);
          } else {
            inProgressStudents.push(student);
          }
        } else {
          notStartedStudents.push(student);
        }
      }
      const inProgressCount = inProgressStudents.length;
      const completedCount = completedStudents.length;
      const notStartedCount = notStartedStudents.length;

      return {
        id: pkg.id,
        packageName: pkg.name,
        totalStudents: assignedTotalStudents,
        notStartedCount,
        inProgressCount,
        completedCount,
      };
    })
  );
  console.log("analytics", analytics);
  return analytics;
}
export async function getFinalExamOfPackageAnalytics() {
  // 1. Get all course packages
  const packages = await prisma.coursePackage.findMany({
    select: {
      id: true,
      name: true,
      subjectPackages: {
        select: {
          subject: true,
          packageType: true,
          kidpackage: true,
        },
      },
    },
  });

  // 2. For each package, gather analytics
  const analytics = await Promise.all(
    packages.map(async (pkg) => {
      // Get all students assigned to this package via subjectPackage
      const subjectPackages = pkg.subjectPackages;
      // 1. Fetch all students with valid status first
      const allStudents = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          status: { in: ["Active", "Not yet", "On progress"] },
        },
        select: {
          wdt_ID: true,
          name: true,
          youtubeSubject: true,
          progress: true,
          subject: true,
          package: true,
          isKid: true,
        },
      });

      // 2. Filter students using hasMatchingSubject for comma-separated subjects
      const assignedStudents = allStudents.filter((student) => {
        if (!student.subject || !student.package || student.isKid === null) {
          return false;
        }

        // Check if student's subjects match any of the subject packages
        return subjectPackages.some((sp) => {
          const subject = sp.subject;
          if (!subject || !sp.packageType || sp.kidpackage === null) return false;
          return sp.packageType === student.package &&
            sp.kidpackage === student.isKid &&
            hasMatchingSubject(student.subject, subject);
        });
      });

      // total Students assigned to this package

      // // Not started: youtubeSubject is null
      // const notStartedStudents = assignedStudents.filter(
      //   (s) => !s.progress || s.youtubeSubject === null
      // );
      const completedStudents: typeof assignedStudents = [];

      const passedStudents: typeof assignedStudents = [];
      const failedStudents: typeof assignedStudents = [];

      const inProgressStudents: typeof assignedStudents = [];
      const notStartedStudents: typeof assignedStudents = [];

      for (const student of assignedStudents) {
        // Get
        const allChapters = await prisma.course.findMany({
          where: { packageId: pkg.id },
          select: { chapters: { select: { id: true } } },
        });
        const chapterIds = allChapters.flatMap((c) =>
          c.chapters.map((ch) => ch.id)
        );
        // Get completed chapters for this student
        const completed = await prisma.studentProgress.findMany({
          where: {
            studentId: student.wdt_ID,
            chapterId: { in: chapterIds },
            // isCompleted: true,
          },
        });

        if (completed.length > 0) {
          if (
            completed.filter((p) => p.isCompleted).length === chapterIds.length
          ) {
            completedStudents.push(student);
          }
        }
      }

      for (const student of completedStudents) {
        const checkFinalExam = await checkFinalExamCreation(
          student.wdt_ID,
          pkg.id
        );
        const updateProhibition = await checkingUpdateProhibition(
          student.wdt_ID,
          pkg.id
        );
        const correctAnswers = await correctExamAnswer(pkg.id, student.wdt_ID);
        if (checkFinalExam && correctAnswers) {
          if (updateProhibition) {
            // If the student has passed the final exam
            if (correctAnswers.result.score >= 0.75) {
              passedStudents.push(student);
            } else {
              failedStudents.push(student);
            }
          } else {
            inProgressStudents.push(student);
          }
        } else {
          notStartedStudents.push(student);
        }
      }
      const assignedTotalCompletedStudents = completedStudents.length;
      const passedCount = passedStudents.length;
      const failedCount = failedStudents.length;
      const inProgressCount = inProgressStudents.length;
      const notStartedCount = notStartedStudents.length;

      return {
        id: pkg.id,
        packageName: pkg.name,
        totalStudents: assignedTotalCompletedStudents,
        notStartedCount,
        inProgressCount,
        failedCount,
        passedCount,
      };
    })
  );
  console.log("analytics", analytics);
  return analytics;
}

//  this is new
export async function getStudentAnalyticsperchapter(
  chapterId: string | number,
  searchTerm?: string,
  currentPage?: number,
  itemsPerPage?: number,
  progressFilter?: "notstarted" | "inprogress" | "completed" | "all"
) {
  const page = currentPage && currentPage > 0 ? currentPage : 1;
  const take = itemsPerPage && itemsPerPage > 0 ? itemsPerPage : 10;
  const skip = (page - 1) * take;

  // 1. Get the packageId for this chapter
  const chapter = await prisma.chapter.findUnique({
    where: { id: String(chapterId) },
    select: { title: true, course: { select: { packageId: true } } },
  });
  const packageId = chapter?.course?.packageId;
  const chapterTitle = chapter?.title;

  // 2. Get all subjectPackages for this package
  const subjectPackages = await prisma.subjectPackage.findMany({
    where: { packageId },
    select: {
      subject: true,
      kidpackage: true,
      packageType: true,
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });


  // 4. Build search filter
  const searchFilter = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm } },
          { phoneno: { contains: searchTerm } },
          ...(Number.isNaN(Number(searchTerm))
            ? []
            : [{ wdt_ID: Number(searchTerm) }]),
        ],
      }
    : {};

  // 4. Fetch all students with valid status first
  const allStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      status: { in: ["Active", "Not yet", "On progress"] },
      ...searchFilter,
    },
    orderBy: { wdt_ID: "asc" },
    select: {
      wdt_ID: true,
      name: true,
      phoneno: true,
      isKid: true,
      chat_id: true,
      country: true,
      subject: true,
      package: true,
      activePackage: { select: { name: true } },
    },
  });

  // 5. Filter students using hasMatchingSubject for comma-separated subjects
  const students = allStudents.filter((student) => {
    if (!student.subject || !student.package || student.isKid === null) {
      return false;
    }

    // Check if student's subjects match any of the subject packages
    return subjectPackages.some((sp) => {
      const subject = sp.subject;
      if (!subject || !sp.packageType || sp.kidpackage === null) return false;
      return sp.packageType === student.package &&
        sp.kidpackage === student.isKid &&
        hasMatchingSubject(student.subject, subject);
    });
  });

  // 6. For each student, get their progress for this chapter
  let studentsWithProgress = await Promise.all(
    students.map(async (student) => {
      const progress = await prisma.studentProgress.findFirst({
        where: {
          studentId: student.wdt_ID,
          chapterId: String(chapterId),
        },
        select: { isCompleted: true },
      });

      let studentProgress: "notstarted" | "inprogress" | "completed" =
        "notstarted";
      if (progress) {
        studentProgress = progress.isCompleted ? "completed" : "inprogress";
      }

      // Format phone number: reverse, last 9 digits, add country code (optional, like package)
      let phoneNo = student.phoneno;
      if (phoneNo) {
        phoneNo = phoneNo.split("").reverse().slice(0, 9).reverse().join("");
        let countryCode = "+251"; // Default Ethiopia
        switch ((student.country || "").toLowerCase()) {
          case "Ethiopia":
            countryCode = "+251";
            break;
          case "Anguilla":
            countryCode = "+1";
            break;
          case "Saudi Arabia":
          case "saudi arabia":
            countryCode = "+966";
            break;
          case "Canada":
            countryCode = "+1";
            break;
          case "United Arab Emirates":
            countryCode = "+971";
            break;
          case "Kuwait":
          case "kuwait":
            countryCode = "+965";
            break;
          case "usa":
          case "United States":
          case "united states of america":
            countryCode = "+1";
            break;
          case "China":
            countryCode = "+86";
            break;
          case "South Africa":
            countryCode = "+27";
            break;
          case "Cuba":
            countryCode = "+53";
            break;
          case "Equatorial Guinea":
            countryCode = "+240";
            break;
          case "Sweden":
            countryCode = "+46";
            break;
          case "Qatar":
            countryCode = "+974";
            break;
          case "Angola":
            countryCode = "+244";
            break;
          case "Pakistan":
            countryCode = "+92";
            break;
          case "Norway":
            countryCode = "+47";
            break;
          case "Netherlands":
            countryCode = "+31";
            break;
          case "Bahrain":
            countryCode = "+973";
            break;
          case "Turkey":
            countryCode = "+90";
            break;
          case "Egypt":
            countryCode = "+20";
            break;
          case "Germany":
            countryCode = "+49";
            break;
          case "Italy":
            countryCode = "+39";
            break;
          case "Djibouti":
            countryCode = "+253";
            break;
          case "Mongolia":
            countryCode = "+976";
            break;
          default:
            countryCode = "+251";
        }
        phoneNo = `${countryCode}${phoneNo}`;
      }

      return {
        id: student.wdt_ID,
        name: student.name,
        phoneNo,
        isKid: student.isKid,
        chatid: student.chat_id,
        activePackage: student.activePackage?.name ?? "",
        studentProgress,
        chapterTitle: chapterTitle ?? "",
      };
    })
  );

  // 7. Filter by progressFilter if provided and not "all"
  if (progressFilter && progressFilter !== "all") {
    studentsWithProgress = studentsWithProgress.filter((student) => {
      if (progressFilter === "inprogress") {
        return student.studentProgress === "inprogress";
      } else {
        return student.studentProgress === progressFilter;
      }
    });
  }

  // 8. Paginate after filtering
  const totalRecords = studentsWithProgress.length;
  const totalPages = Math.ceil(totalRecords / take);
  const paginatedStudents = studentsWithProgress.slice(skip, skip + take);

  return {
    data: paginatedStudents,
    pagination: {
      currentPage: page,
      totalPages,
      itemsPerPage: take,
      totalRecords,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
function formatLastSeen(lastSeenDate: Date | null | undefined): string {
  if (!lastSeenDate) return "not login";

  const daysAgo = differenceInCalendarDays(
    new Date(),
    lastSeenDate
  );

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "1 day ago";
  if (daysAgo === 2) return "2 days ago";
  if (daysAgo === 3) return "3 days ago";
  
  if (daysAgo <= 7) return `${daysAgo} days ago`;
  if (daysAgo <= 14) return "1 week ago";
  if (daysAgo <= 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
  if (daysAgo <= 60) return "1 month ago";
  if (daysAgo <= 365) return `${Math.floor(daysAgo / 30)} months ago`;
  if (daysAgo <= 730) return "1 year ago";
  return `${Math.floor(daysAgo / 365)} years ago`;
}

async function getLastSeen(studentId: number): Promise<string> {
  const attendance = await prisma.attendance.findFirst({
    where: { studentId },
    select: { lastSeen: true },
    orderBy: { lastSeen: "desc" }
  });

  return formatLastSeen(attendance?.lastSeen);
}
export async function getStudentAnalyticsperPackage(
  searchTerm?: string,
  currentPage: number = 1,
  itemsPerPage: number = 10,
  progressFilter?: "notstarted" | "inprogress" | "completed" | "all",
  statusFilter?: "notstarted" | "inprogress" | "failed" | "passed" | "all",
  lastSeenFilter?: "today" | "1day" | "2days" | "3days" | "3plus" | "all",
  tefsirFilter?: boolean
) {
  const skip = (currentPage - 1) * itemsPerPage;

  // 1. Fetch distinct subject packages
  const subjectPackages = await prisma.subjectPackage.findMany({
    select: {
      subject: true,
      kidpackage: true,
      packageType: true,
      packageId: true,
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });

  // 2. Build search filter
  const searchFilter = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm } },
          { phoneno: { contains: searchTerm } },
          ...(Number.isNaN(Number(searchTerm))
            ? []
            : [{ wdt_ID: Number(searchTerm) }]),
        ],
      }
    : {};

  // 3. Fetch all students first (without subject filtering)
  const allStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      status: { in: ["Active", "Not yet","On progress"] },
      ...searchFilter,
    },
    orderBy: { wdt_ID: "asc" },
    select: {
      wdt_ID: true,
      name: true,
      phoneno: true,
      country: true,
      isKid: true,
      subject: true,
      package: true,
      chat_id: true,
      status: true,
      youtubeSubject: true,
      ustazdata: { select: { ustazname: true } },
      attendances: {
        select: { lastSeen: true },
        take: 1,
        orderBy: { lastSeen: "desc" }
      }
    },
  });

  // 4. Filter students using hasMatchingSubject for comma-separated subjects
  const students = allStudents.filter((student) => {
    if (!student.subject || !student.package || student.isKid === null) {
      return false;
    }

    // Apply Tefsir filter logic
    if (tefsirFilter) {
      // When Tefsir filter is ON: Only show "On progress" students with Tefsir subjects
      if (student.status !== "On progress") {
        return false;
      }
      
      // Check if student's subjects contain "Tefsir" (comma-separated handling)
      return hasMatchingSubject(student.subject, "Tefsir");
    } else {
      // When Tefsir filter is OFF: Show all students with valid subject packages
      return subjectPackages.some((sp) => 
        sp.packageType === student.package &&
        sp.kidpackage === student.isKid &&
        hasMatchingSubject(student.subject??"", sp.subject??"")
      );
    }
  });

  const attendanceMap = await getAttendanceofAllStudents(
    students.map((s) => s.wdt_ID)
  );

  // 5. Helper: Format phone number
  const formatPhoneNumber = (
    raw: string | null,
    country: string | null
  ): string => {
    if (!raw) return "";
    const trimmed = raw.split("").reverse().slice(0, 9).reverse().join("");
    const countryCodeMap: Record<string, string> = {
      ethiopia: "+251",
      anguilla: "+1",
      "saudi arabia": "+966",
      canada: "+1",
      "united arab emirates": "+971",
      kuwait: "+965",
      usa: "+1",
      "united states": "+1",
      "united states of america": "+1",
      china: "+86",
      "south africa": "+27",
      cuba: "+53",
      "equatorial guinea": "+240",
      sweden: "+46",
      qatar: "+974",
      angola: "+244",
      pakistan: "+92",
      norway: "+47",
      netherlands: "+31",
      bahrain: "+973",
      turkey: "+90",
      egypt: "+20",
      germany: "+49",
      italy: "+39",
      djibouti: "+253",
      mongolia: "+976",
    };
    const key = (country || "").toLowerCase();
    const code = countryCodeMap[key] ?? "+251";
    return `${code}${trimmed}`;
  };

  // 5. Process each student
  const studentResults = await Promise.all(
    students.map(async (student) => {
      const matchedPackage = subjectPackages.find(
        (sp) =>
          hasMatchingSubject(student.subject ?? "", sp.subject ?? "") &&
          sp.packageType === student.package &&
          sp.kidpackage === student.isKid
      );

      const activePackageId =
        student.youtubeSubject ?? matchedPackage?.packageId;
      if (!activePackageId) return undefined;

      const progress = await getStudentProgressStatus(
        student.wdt_ID,
        activePackageId
      );
      const activePackage = await prisma.coursePackage.findUnique({
        where: { id: activePackageId },
        select: { name: true },
      });

      const phoneNo = formatPhoneNumber(student.phoneno, student.country);

      let result = { total: 0, correct: 0, score: 0 };
      let hasFinalExam = false;
      let isUpdateProhibited = false;
      if (progress === "completed") {
        const [examData, finalExamStatus, updateProhibition] =
          await Promise.all([
            correctExamAnswer(activePackageId, student.wdt_ID),
            checkFinalExamCreation(student.wdt_ID, activePackageId),
            checkingUpdateProhibition(student.wdt_ID, activePackageId),
          ]);

        if (examData?.result) result = examData.result;
        hasFinalExam = !!finalExamStatus;
        isUpdateProhibited = !!updateProhibition;
      }

      const attendance = attendanceMap[student.wdt_ID] ?? {
        present: 0,
        absent: 0,
      };
      const totalSessions = attendance.present + attendance.absent;
      const lastseen = formatLastSeen(student.attendances[0]?.lastSeen);

      return {
        id: student.wdt_ID,
        name: student.name,
        phoneNo,
        ustazname: student.ustazdata?.ustazname ?? "",
        tglink: `https://t.me/${student.chat_id}`,
        whatsapplink: `https://wa.me/${phoneNo}`,
        isKid: student.isKid,
        chatid: student.chat_id,
        activePackage: activePackage?.name ?? "",
        studentProgress: progress,
        result,
        hasFinalExam,
        lastseen,
        isUpdateProhibited,
        attendances: `P-${attendance.present} A-${attendance.absent} T-${totalSessions}`,
      };
    })
  );

  // 6. Filter by progress  
  let filteredStudents = studentResults.filter(Boolean);

  if (progressFilter && progressFilter !== "all") {
    filteredStudents = filteredStudents.filter((student) => {
      if (!student) return false;
      if (progressFilter === "inprogress") {
        return (
          student.studentProgress !== "completed" &&
          student.studentProgress !== "notstarted"
        );
      }
      return student.studentProgress === progressFilter;
    });
  }

  // 7. Filter by exam status
  if (statusFilter && statusFilter !== "all") {
    filteredStudents = filteredStudents.filter((student) => {
      if (!student) return false;
      const { hasFinalExam, isUpdateProhibited, result } = student;
      switch (statusFilter) {
        case "passed":
          return hasFinalExam && isUpdateProhibited && result.score >= 0.75;
        case "failed":
          return hasFinalExam && isUpdateProhibited && result.score < 0.75;
        case "inprogress":
          return hasFinalExam && !isUpdateProhibited;
        case "notstarted":
          return !hasFinalExam;
        default:
          return true;
      }
    });
  }

  // 8. Filter by last seen
  if (lastSeenFilter && lastSeenFilter !== "all") {
    filteredStudents = filteredStudents.filter((student) => {
      if (!student) return false;
      const { lastseen } = student;
      switch (lastSeenFilter) {
        case "today":
          return lastseen === "Today";
        case "1day":
          return lastseen === "1 day ago";
        case "2days":
          return lastseen === "2 days ago";
        case "3days":
          return lastseen === "3 days ago";
        case "3plus":
          return !["Today", "1 day ago", "2 days ago", "3 days ago", "not login", "-"].includes(lastseen);
        default:
          return true;
      }
    });
  }

  // 9. Paginate
  const totalRecords = filteredStudents.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(skip, skip + itemsPerPage);

  return {
    data: paginatedStudents,
    pagination: {
      currentPage,
      totalPages,
      itemsPerPage,
      totalRecords,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  };
}

export async function getAvailablePackagesForStudent(studentId: number) {
  // Get student details
  const student = await prisma.wpos_wpdatatable_23.findUnique({
    where: { wdt_ID: studentId },
    select: {
      subject: true,
      package: true,
      isKid: true,
      youtubeSubject: true, // Current active package
    },
  });

  if (!student) return [];

  // Get all subject packages for this package type and kid status
  const allSubjectPackages = await prisma.subjectPackage.findMany({
    where: {
      packageType: student.package,
      kidpackage: student.isKid,
    },
    select: {
      packageId: true,
      subject: true,
      package: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Filter packages where student's subjects match any of the required subjects
  const availablePackages = allSubjectPackages.filter((pkg) =>
    hasMatchingSubject(student.subject ?? "", pkg.subject ?? "")
  );

  // For each package, get the student's progress status and details
  const packagesWithProgress = await Promise.all(
    availablePackages.map(async (pkg) => {
      const progress = await getStudentProgressStatus(studentId, pkg.packageId);

      let status: "notstarted" | "inprogress" | "completed" = "notstarted";
      let progressDetails = null;

      if (progress === "completed") {
        status = "completed";
      } else if (progress !== "notstarted") {
        status = "inprogress";
        progressDetails = progress; // This contains the detailed progress string
      }

      // Get total chapters and completed chapters for progress percentage
      const chapters = await prisma.chapter.findMany({
        where: { course: { packageId: pkg.packageId } },
        select: { id: true },
      });
      const chapterIds = chapters.map((ch) => ch.id);

      const completedChapters = await prisma.studentProgress.count({
        where: {
          studentId,
          chapterId: { in: chapterIds },
          isCompleted: true,
        },
      });

      const progressPercentage =
        chapterIds.length > 0
          ? Math.round((completedChapters / chapterIds.length) * 100)
          : 0;
      const isActive = student.youtubeSubject === pkg.packageId;

      return {
        id: pkg.package.id,
        name: pkg.package.name,
        status,
        progressDetails,
        progressPercentage,
        totalChapters: chapterIds.length,
        completedChapters,
        isActive,
      };
    })
  );

  return packagesWithProgress;
}

export async function sendProgressMessages() {
  // 1. Get all subjectPackages for this package
  const subjectPackages = await prisma.subjectPackage.findMany({
    select: {
      subject: true,
      kidpackage: true,
      packageType: true,
      packageId: true,
    },
    distinct: ["subject", "kidpackage", "packageType"],
  });

  // 2. Fetch all students with valid status first
  const allStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      status: { in: ["Active", "Not yet", "On progress"] },
    },
    orderBy: { wdt_ID: "asc" },
    select: {
      wdt_ID: true,
      name: true,
      phoneno: true,
      country: true,
      isKid: true,
      subject: true,
      package: true,
      chat_id: true,
      ustazdata: {
        select: { ustazname: true },
      },
    },
  });

  // 3. Filter students using hasMatchingSubject for comma-separated subjects
  const students = allStudents.filter((student) => {
    if (!student.subject || !student.package || student.isKid === null) {
      return false;
    }

    // Check if student's subjects match any of the subject packages
    return subjectPackages.some((sp) => {
      const subject = sp.subject;
      if (!subject || !sp.packageType || sp.kidpackage === null) return false;
      return sp.packageType === student.package &&
        sp.kidpackage === student.isKid &&
        hasMatchingSubject(student.subject, subject);
    });
  });

  // 4. For each student, find their subjectPackage and get progress
  const studentsWithProgress = await Promise.all(
    students.map(async (student) => {
      // Find the subjectPackage for this student
      const matchedSubjectPackage = subjectPackages.find(
        (sp) =>
          hasMatchingSubject(student.subject ?? "", sp.subject ?? "") &&
          sp.packageType === student.package &&
          sp.kidpackage === student.isKid
      );
      const activePackageId = matchedSubjectPackage?.packageId ?? "";

      const progress = await getStudentProgressStatus(
        student.wdt_ID,
        activePackageId
      );

      return {
        chatid: student.chat_id,
        studId: student.wdt_ID,
        name: student.name,
        progress,
      };
    })
  );

  // Return array of { chatid, progress }
  console.log("Students with progress:", studentsWithProgress);
  return studentsWithProgress;
}
