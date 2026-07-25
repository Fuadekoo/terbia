"use server";
import prisma from "@/lib/db";
import { getAvailablePacakges } from "@/actions/student/package";
import { updatePathProgressData } from "@/actions/student/progress";

type TelegramUser = {
  wdt_ID: number;
  name: string | null;
  chat_id: string | null;
  status: string | null;
  // Optional extra shape for UI convenience
  activePackage?: { id: string; name: string } | null;
};

interface TelegramUserResult {
  success: boolean;
  users?: TelegramUser[];
  error?: string;
}

// Gate by Telegram chatId and return matching user rows
export async function getTelegramUser(
  chatId: string
): Promise<TelegramUserResult> {
  try {
    if (!chatId || !String(chatId).trim()) {
      return { success: false, error: "Missing chatId" };
    }

    // Most of the bot code uses this table with chat_id and status filtering
    const users = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        chat_id: String(chatId),
        status: { in: ["Active", "Not yet", "On progress", "terbia"] },
      },
      select: {
        wdt_ID: true,
        name: true,
        chat_id: true,
        status: true,
        subject: true,
        package: true,
        isKid: true,
        activePackage: {
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
          },
        },

        // Include other columns you need here
      },
      orderBy: { wdt_ID: "asc" },
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error fetching Telegram user(s) by chatId:", error);
    return { success: false, error: "Failed to fetch user(s)" };
  }
}

interface StartFlowResultSingle {
  mode: "single";
  url: string;
  packageName: string;
  packageThumbnail?: string | null;
  studentId: number;
  studentName: string | null;
}

interface StartFlowResultChoose {
  mode: "choose";
  students: Array<{
    studentId: number;
    name: string | null;
    avatar: { initials: string; color: string };
    packages: Array<{
      id: string;
      name: string;
      thumbnail?: string | null;
      progressPercentage?: number;
    }>;
    subject?: string | null;
    teacherName?: string | null;
    classFee?: string | null;
  }>;
}

export type StartFlowResult =
  | { success: true; data: StartFlowResultSingle | StartFlowResultChoose }
  | { success: false; error: string };

function buildAvatar(name: string | null): { initials: string; color: string } {
  const initials = (name || "Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "S")
    .join("");
  const palette = [
    "#6C5CE7",
    "#0984E3",
    "#00B894",
    "#E17055",
    "#D63031",
    "#E84393",
  ];
  const code = (initials.charCodeAt(0) || 83) + (initials.charCodeAt(1) || 0);
  const color = palette[code % palette.length];
  return { initials, color };
}

export async function startStudentFlow(
  chatId: string
): Promise<StartFlowResult> {
  try {
    if (!chatId || !String(chatId).trim()) {
      return { success: false, error: "Missing chatId" };
    }

    const BASE_URL = process.env.FORWARD_URL || process.env.AUTH_URL;
    if (!BASE_URL) {
      return { success: false, error: "Missing BASE_URL configuration" };
    }

    const channels = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        chat_id: String(chatId),
        status: { in: ["Active", "Not yet", "On progress", "terbia"] },
      },
      select: {
        wdt_ID: true,
        name: true,
        subject: true,
        package: true,
        isKid: true,
        ustazdata: {
          select: {
            ustazname: true,
          },
        },
        activePackage: {
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            courses: {
              where: { order: 1 },
              select: {
                id: true,
                chapters: { where: { position: 1 }, select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: { wdt_ID: "asc" },
    });

    if (!channels.length) {
      return {
        success: false,
        error: "No active student found for this chatId",
      };
    }

    const choosePayload: StartFlowResultChoose["students"] = [];
    const immediate: Array<StartFlowResultSingle> = [];

    async function computePackageProgress(
      studentId: number,
      packageId: string
    ): Promise<number> {
      try {
        const chapters = await prisma.chapter.findMany({
          where: { course: { packageId } },
          select: { id: true },
        });
        const chapterIds = chapters.map((ch) => ch.id);
        if (chapterIds.length === 0) return 0;
        const completedChapters = await prisma.studentProgress.count({
          where: {
            studentId,
            chapterId: { in: chapterIds },
            isCompleted: true,
          },
        });
        return Math.round((completedChapters / chapterIds.length) * 100);
      } catch {
        return 0;
      }
    }

    for (const channel of channels) {
      const packageType = (channel as unknown as { package: string | null })
        .package;
      const subject = (channel as unknown as { subject: string | null })
        .subject;
      const isKid = (channel as unknown as { isKid: boolean | null }).isKid;
      const studentId = channel.wdt_ID;
      const studentName = channel.name;

      if (!packageType || !subject || isKid === null) continue;

      // Fetch available packages list for choice rendering
      type AvailablePackage = {
        id: string;
        subject: string | null;
        package: { id: string; name: string; thumbnail: string | null };
      };
      const availablePackages: AvailablePackage[] = await getAvailablePacakges(
        packageType,
        subject,
        isKid
      );
      const validPackages = (availablePackages || []).filter((pkg) => pkg.id);

      if (validPackages.length === 1) {
        // Initialize progress using the student's activePackage first chapter when present
        const firstChapterId = channel.activePackage?.courses?.[0]
          ?.chapters?.[0]?.id as string | undefined;
        if (firstChapterId) {
          const existingProgress = await prisma.studentProgress.findFirst({
            where: { studentId, chapterId: firstChapterId },
          });
          if (!existingProgress) {
            await prisma.studentProgress.create({
              data: {
                studentId,
                chapterId: firstChapterId,
                isCompleted: false,
              },
            });
          }
        }

        const progressPath = await updatePathProgressData(studentId);
        if (!progressPath) continue;
        const [courseId, chapterId] = progressPath;
        const lang = "en";
        const stud = "student";
        const url = `${BASE_URL}/${lang}/${stud}/${studentId}/${courseId}/${chapterId}`;

        immediate.push({
          mode: "single",
          url,
          packageName:
            (channel.activePackage as { name?: string } | null)?.name ||
            "Package",
          packageThumbnail: validPackages[0].package.thumbnail ?? null,
          studentId,
          studentName,
        });
      } else {
        // Build packages with progress for selection
        const packagesWithProgress = await Promise.all(
          validPackages.map(async (p) => ({
            id: p.package.id,
            name: p.package.name,
            thumbnail: p.package.thumbnail ?? null,
            progressPercentage: await computePackageProgress(
              studentId,
              p.package.id
            ),
          }))
        );

        choosePayload.push({
          studentId,
          name: studentName,
          avatar: buildAvatar(studentName),
          packages: packagesWithProgress,
          subject: subject,
          teacherName:
            (
              channel as unknown as {
                ustazdata?: { ustazname?: string | null } | null;
              }
            ).ustazdata?.ustazname || null,
          classFee: "ETB 4000", // Default fee, can be made dynamic later
        });
      }
    }

    // Return direct only when exactly one student and exactly one package
    if (
      channels.length === 1 &&
      immediate.length === 1 &&
      choosePayload.length === 0
    ) {
      return { success: true, data: immediate[0] };
    }

    // Otherwise build a chooser list.
    if (choosePayload.length > 0 || immediate.length > 0) {
      const merged: StartFlowResultChoose["students"] = [
        ...choosePayload,
        ...(await Promise.all(
          immediate.map(async (i) => {
            const channel = channels.find((c) => c.wdt_ID === i.studentId);
            const activeId =
              (channel?.activePackage as { id?: string } | null)?.id ||
              "active";
            const progress =
              activeId === "active"
                ? 0
                : await computePackageProgress(i.studentId, activeId);
            return {
              studentId: i.studentId,
              name: i.studentName,
              avatar: buildAvatar(i.studentName),
              packages: [
                {
                  id: activeId,
                  name: i.packageName,
                  thumbnail: i.packageThumbnail ?? null,
                  progressPercentage: progress,
                },
              ],
              subject:
                (channel as unknown as { subject?: string | null })?.subject ||
                null,
              teacherName:
                (
                  channel as unknown as {
                    ustazdata?: { ustazname?: string | null } | null;
                  }
                )?.ustazdata?.ustazname || null,
              classFee: "ETB 4000",
            };
          })
        )),
      ];
      return { success: true, data: { mode: "choose", students: merged } };
    }

    return { success: false, error: "No available packages for this account" };
  } catch (error) {
    console.error("Error in startStudentFlow:", error);
    return { success: false, error: "Failed to start student flow" };
  }
}

// chatId is optional — the student is identified by wdt_ID from the URL.
export async function chooseStudentPackage(
  _chatId: string | null | undefined,
  studentId: number,
  packageId: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    if (!studentId || !packageId) {
      return { success: false, error: "Missing studentId or packageId" };
    }

    const BASE_URL = process.env.FORWARD_URL || process.env.AUTH_URL;
    if (!BASE_URL) {
      return { success: false, error: "Missing BASE_URL configuration" };
    }

    const validPackage = await prisma.coursePackage.findUnique({
      where: { id: packageId },
    });
    if (!validPackage) {
      return { success: false, error: "Invalid package" };
    }

    const resolvedId = await resolveStudentId(studentId);
    if (resolvedId === null) {
      return { success: false, error: "Student profile not found" };
    }
    studentId = resolvedId;

    await prisma.wpos_wpdatatable_23.updateMany({
      where: { wdt_ID: studentId },
      data: { youtubeSubject: packageId },
    });

    const activePackage = await prisma.coursePackage.findUnique({
      where: { id: packageId },
      select: {
        courses: {
          where: { order: 1 },
          select: {
            id: true,
            chapters: { where: { position: 1 }, select: { id: true } },
          },
        },
      },
    });

    if (
      !activePackage ||
      !activePackage.courses.length ||
      !activePackage.courses[0].chapters.length
    ) {
      return { success: false, error: "Selected package has no content" };
    }

    const firstChapterId = activePackage.courses[0].chapters[0].id;
    const existingProgress = await prisma.studentProgress.findFirst({
      where: { studentId, chapterId: firstChapterId },
    });
    if (!existingProgress) {
      await prisma.studentProgress.create({
        data: { studentId, chapterId: firstChapterId, isCompleted: false },
      });
    }

    const update = await updatePathProgressData(studentId);
    if (!update) {
      return { success: false, error: "Failed to compute progress path" };
    }
    const [courseId, chapterId] = update;
    const lang = "en";
    const stud = "student";
    const url = `${BASE_URL}/${lang}/${stud}/${studentId}/${courseId}/${chapterId}`;

    return { success: true, url };
  } catch (error) {
    console.error("Error in chooseStudentPackage:", error);
    return { success: false, error: "Failed to set package" };
  }
}

// Resolve the number that appears in /student/<id> to a real wdt_ID.
// Normally it IS the wdt_ID, but some bot deep links pass the Telegram chat_id
// as the start_param instead, so fall back to looking the student up by chat_id.
// Returns null only when nothing in the table matches.
async function resolveStudentId(idFromUrl: number): Promise<number | null> {
  if (!idFromUrl) return null;

  const byWdtId = await prisma.wpos_wpdatatable_23.findFirst({
    where: { wdt_ID: Number(idFromUrl) },
    select: { wdt_ID: true },
  });
  if (byWdtId) return byWdtId.wdt_ID;

  const byChatId = await prisma.wpos_wpdatatable_23.findFirst({
    where: { chat_id: String(idFromUrl) },
    select: { wdt_ID: true },
    orderBy: { wdt_ID: "asc" },
  });
  return byChatId?.wdt_ID ?? null;
}

// Validate access to a specific student (wdt_ID).
// Access is granted by the link alone: anyone holding /student/<wdt_ID> can learn,
// as long as the student record exists and has a learning-eligible status.
// chatId is optional and no longer required to match the registered Telegram chat.
export async function validateStudentAccess(
  _chatId: string | null | undefined,
  studentId: number
): Promise<{ authorized: boolean }> {
  try {
    if (!studentId) {
      return { authorized: false };
    }
    // No status filter: the link itself grants access, whatever the student's
    // status is. Only a completely unknown id is rejected.
    const resolved = await resolveStudentId(Number(studentId));
    return { authorized: resolved !== null };
  } catch {
    return { authorized: false };
  }
}

// Get flow data for a specific student by ID.
// chatId is optional — the wdt_ID in the URL is what identifies the student, so the
// page works both inside the Telegram Mini App and from a plain browser link.
export async function getStudentFlowById(
  _chatId: string | null | undefined,
  studentId: number
): Promise<StartFlowResult> {
  try {
    if (!studentId) {
      return { success: false, error: "Missing studentId" };
    }

    const BASE_URL = process.env.FORWARD_URL || process.env.AUTH_URL;
    if (!BASE_URL) {
      return { success: false, error: "Missing BASE_URL configuration" };
    }

    // The URL number is normally the wdt_ID, but older bot links pass chat_id.
    const resolvedId = await resolveStudentId(studentId);
    if (resolvedId === null) {
      return { success: false, error: "Student profile not found" };
    }
    studentId = resolvedId;

    // Get the specific student record. No status filter — the link grants access.
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        wdt_ID: studentId,
      },
      select: {
        wdt_ID: true,
        name: true,
        subject: true,
        package: true,
        isKid: true,
        ustazdata: {
          select: {
            ustazname: true,
          },
        },
        activePackage: {
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            courses: {
              where: { order: 1 },
              select: {
                id: true,
                chapters: { where: { position: 1 }, select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return { success: false, error: "Student profile not found" };
    }

    const packageType = (student as unknown as { package: string | null })
      .package;
    const subject = (student as unknown as { subject: string | null }).subject;
    const isKid = (student as unknown as { isKid: boolean | null }).isKid;

    if (!packageType || !subject || isKid === null) {
      return { success: false, error: "Invalid student configuration" };
    }

    async function computePackageProgress(packageId: string): Promise<number> {
      try {
        const chapters = await prisma.chapter.findMany({
          where: { course: { packageId } },
          select: { id: true },
        });
        const chapterIds = chapters.map((ch) => ch.id);
        if (chapterIds.length === 0) return 0;
        const completedChapters = await prisma.studentProgress.count({
          where: {
            studentId,
            chapterId: { in: chapterIds },
            isCompleted: true,
          },
        });
        return Math.round((completedChapters / chapterIds.length) * 100);
      } catch {
        return 0;
      }
    }

    // Fetch available packages
    type AvailablePackage = {
      id: string;
      subject: string | null;
      package: { id: string; name: string; thumbnail: string | null };
    };
    const availablePackages: AvailablePackage[] = await getAvailablePacakges(
      packageType,
      subject,
      isKid
    );
    const validPackages = (availablePackages || []).filter((pkg) => pkg.id);

    if (validPackages.length === 0) {
      return {
        success: false,
        error: "No available packages for this student",
      };
    }

    // If only one package, create single mode result
    if (validPackages.length === 1) {
      const packageId = validPackages[0].package.id;

      // Get first chapter of this package to initialize progress if needed
      const firstPackageCourse = await prisma.coursePackage.findUnique({
        where: { id: packageId },
        select: {
          courses: {
            where: { order: 1 },
            select: {
              id: true,
              chapters: {
                where: { position: 1 },
                select: { id: true },
              },
            },
          },
        },
      });

      const firstChapterId =
        firstPackageCourse?.courses?.[0]?.chapters?.[0]?.id;
      if (firstChapterId) {
        const existingProgress = await prisma.studentProgress.findFirst({
          where: { studentId, chapterId: firstChapterId },
        });
        if (!existingProgress) {
          await prisma.studentProgress.create({
            data: { studentId, chapterId: firstChapterId, isCompleted: false },
          });
        }
      }

      const progressPath = await updatePathProgressData(studentId);
      if (!progressPath) {
        return { success: false, error: "Failed to compute progress path" };
      }

      const [courseId, chapterId] = progressPath;
      const lang = "en";
      const stud = "student";
      const url = `${BASE_URL}/${lang}/${stud}/${studentId}/${courseId}/${chapterId}`;

      return {
        success: true,
        data: {
          mode: "single",
          url,
          packageName: validPackages[0].package.name,
          packageThumbnail: validPackages[0].package.thumbnail ?? null,
          studentId,
          studentName: student.name,
        },
      };
    }

    // Multiple packages - create choose mode result
    const packagesWithProgress = await Promise.all(
      validPackages.map(async (p) => ({
        id: p.package.id,
        name: p.package.name,
        thumbnail: p.package.thumbnail ?? null,
        progressPercentage: await computePackageProgress(p.package.id),
      }))
    );

    return {
      success: true,
      data: {
        mode: "choose",
        students: [
          {
            studentId,
            name: student.name,
            avatar: buildAvatar(student.name),
            packages: packagesWithProgress,
            subject: subject,
            teacherName:
              (
                student as unknown as {
                  ustazdata?: { ustazname?: string | null } | null;
                }
              ).ustazdata?.ustazname || null,
            classFee: "ETB 4000",
          },
        ],
      },
    };
  } catch (error) {
    console.error("Error in getStudentFlowById:", error);
    return { success: false, error: "Failed to get student flow data" };
  }
}
