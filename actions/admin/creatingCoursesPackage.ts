"use server";

import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import prisma from "@/lib/db";

export async function createCoursePackage(name: string) {
  try {
    console.log("Creating course package with name:", name);

    const createdCoursePackage = await prisma.coursePackage.create({
      data: { name },
    });

    console.log("Created course package:", createdCoursePackage);
    return createdCoursePackage;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("[COURSES]", error.message, error.stack);
    throw new Error("Internal Error");
  }
}

export async function unpublishCoursePackage(coursesPackageId: string) {
  try {
    const coursePackageOwner = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
    });

    if (!coursePackageOwner) {
      return { error: "Unauthorized", status: 401 };
    }

    const unpublishedCoursePackage = await prisma.coursePackage.update({
      where: { id: coursesPackageId },
      data: { isPublished: false },
    });

    return { data: unpublishedCoursePackage, status: 200 };
  } catch (error) {
    console.error("[COURSES_course_ID]", error);
    return { error: "Internal Error", status: 500 };
  }
}

export async function publishCoursePackage(coursesPackageId: string) {
  try {
    // Step 1: Check ownership
    const coursePackageOwner = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
    });

    if (!coursePackageOwner) {
      return { error: "Unauthorized", status: 401 };
    }

    // Step 2: Validate name exists
    const coursesPackage = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
      select: { name: true },
    });

    if (!coursesPackage?.name) {
      return { error: "Package not found or missing title", status: 404 };
    }

    // Step 3: Publish only if at least one course is published
    const publishedCoursesPackage = await prisma.coursePackage.update({
      where: {
        id: coursesPackageId,
        // courses: { some: { isPublished: true } },
      },
      data: { isPublished: true },
    });

    return { data: publishedCoursesPackage, status: 200 };
  } catch (error) {
    console.error("[publishedCourse]", error);
    return { error: "Internal Error", status: 500 };
  }
}

export async function deleteCoursePackage(coursesPackageId: string) {
  try {
    const existingPackage = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
    });

    if (!existingPackage) {
      return { error: "Course package not found", status: 404 };
    }

    const deletedPackage = await prisma.coursePackage.delete({
      where: { id: coursesPackageId },
    });

    return { data: deletedPackage, status: 200 };
  } catch (error) {
    console.error("[deleteCoursePackage]", error);
    return { error: "Internal Error", status: 500 };
  }
}

export async function updateCoursePackageName(
  coursesPackageId: string,
  name: string
) {
  try {
    const existingPackage = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
    });

    if (!existingPackage) {
      return { error: "Course package not found", status: 404 };
    }

    const updatedPackage = await prisma.coursePackage.update({
      where: { id: coursesPackageId },
      data: { name },
    });

    return { data: updatedPackage, status: 200 };
  } catch (error) {
    console.error("[updateCoursePackage]", error);
    return { error: "Internal Error", status: 500 };
  }
}

export async function updateCoursePackageDescription(
  coursesPackageId: string,
  description: string
) {
  try {
    const existingPackage = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
    });

    if (!existingPackage) {
      return { error: "Course package not found", status: 404 };
    }

    const updatedPackage = await prisma.coursePackage.update({
      where: { id: coursesPackageId },
      data: { description },
    });

    return { data: updatedPackage, status: 200 };
  } catch (error) {
    console.error("[updateCoursePackage]", error);
    return { error: "Internal Error", status: 500 };
  }
}

export async function updateCoursePackageThumbnail(
  coursesPackageId: string,
  thumbnail: string | null
) {
  try {
    const existingPackage = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
      select: { thumbnail: true },
    });

    if (!existingPackage) {
      return { error: "Course package not found", status: 404 };
    }

    const previousThumbnail = existingPackage.thumbnail;

    const updatedPackage = await prisma.coursePackage.update({
      where: { id: coursesPackageId },
      data: { thumbnail },
    });

    if (thumbnail === null && previousThumbnail) {
      const previousFilename = previousThumbnail.split("/").pop();
      if (previousFilename) {
        const thumbnailsDir = join(process.cwd(), "docs", "thumbnails");
        const previousFilePath = join(thumbnailsDir, previousFilename);
        await rm(previousFilePath, { force: true });
      }
    }

    return { data: updatedPackage, status: 200 };
  } catch (error) {
    console.error("[updateCoursePackageThumbnail]", error);
    return { error: "Internal Error", status: 500 };
  }
}

export async function uploadCoursePackageThumbnailFile(formData: FormData) {
  try {
    const file = formData.get("file") as File | null;
    const coursesPackageId = formData.get("coursesPackageId") as string | null;

    if (!file || !coursesPackageId) {
      return { error: "File and course package ID are required", status: 400 };
    }

    const allowedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
    const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
    const mimeToExtension: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };

    const originalExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mimeExtension = mimeToExtension[file.type] ?? "";

    const extension = allowedExtensions.has(originalExtension)
      ? originalExtension
      : mimeExtension;

    if (!extension || !allowedExtensions.has(extension)) {
      return { error: "Unsupported file type", status: 415 };
    }

    if (file.type && !allowedMimeTypes.has(file.type)) {
      return { error: "Unsupported file type", status: 415 };
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { error: "File too large (max 5MB)", status: 413 };
    }

    const existingPackage = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
      select: { thumbnail: true },
    });

    if (!existingPackage) {
      return { error: "Course package not found", status: 404 };
    }

    const thumbnailsDir = join(process.cwd(), "docs", "thumbnails");
    await mkdir(thumbnailsDir, { recursive: true });

    const filename = `${coursesPackageId}-${Date.now()}.${extension}`;
    const filePath = join(thumbnailsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    await prisma.coursePackage.update({
      where: { id: coursesPackageId },
      data: { thumbnail: filename },
    });

    const previousThumbnail = existingPackage.thumbnail;
    if (previousThumbnail) {
      const previousFilename = previousThumbnail.split("/").pop();
      if (previousFilename && previousFilename !== filename) {
        const previousFilePath = join(thumbnailsDir, previousFilename);
        await rm(previousFilePath, { force: true });
      }
    }

    return {
      status: 200,
      data: {
        filename,
        url: `/api/thumbnails/${filename}`,
      },
    };
  } catch (error) {
    console.error("[uploadCoursePackageThumbnailFile]", error);
    return { error: "Failed to upload thumbnail", status: 500 };
  }
}

export async function updatingExamDurationMinute(
  coursesPackageId: string,
  examDurationMinutes: number | null
) {
  try {
    const existingPackage = await prisma.coursePackage.findUnique({
      where: { id: coursesPackageId },
    });

    if (!existingPackage) {
      return { error: "Course package not found", status: 404 };
    }

    const updatedPackage = await prisma.coursePackage.update({
      where: { id: coursesPackageId },
      data: { examDurationMinutes },
    });

    return { data: updatedPackage, status: 200 };
  } catch (error) {
    console.error("[updateCoursePackage]", error);
    return { error: "Internal Error", status: 500 };
  }
}
