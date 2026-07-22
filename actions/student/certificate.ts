"use server";
import prisma from "@/lib/db";
import { correctExamAnswer } from "./question";

export default async function getCertificateData(
  studentId: number,
  coursesPackageId: string
) {
  try {
    // 1. Fetch the certificate data for the student and package
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        wdt_ID: studentId,
        status: { in: ["Active", "Not yet", "On progress", "terbia"] },
      },
      select: {
        wdt_ID: true,
        name: true,
      },
    });
    if (!student || !student.wdt_ID || !student.name) {
      throw Error("the student is not registerd");
    }
    const studId = student.wdt_ID;
    const sName = student.name;

    const coursesPackage = await prisma.coursePackage.findFirst({
      where: {
        id: coursesPackageId,
      },
      select: {
        id: true,
        name: true,
      },
    });
    if (!coursesPackage || !coursesPackage.id || !coursesPackage.name) {
      throw Error("this package is not assinged");
    }
    const cId = coursesPackage.id;
    const cName = coursesPackage.name;
    const result = (await correctExamAnswer(coursesPackageId, studentId))
      ?.result;
    if (!result) {
      return undefined;
    }
    const finalUpdatedTime = await prisma.finalExamResult.findFirst({
      where: { studentId, packageId: coursesPackageId },
      select: {
        endingTime: true,
        startingTime: true,
      },
    });
    const endTime = finalUpdatedTime?.endingTime ?? new Date();
    const startTime = finalUpdatedTime?.startingTime ?? new Date();
    return {
      studId,
      sName,
      cId,
      cName,
      startTime,
      endTime,
      result,
    };
  } catch (error) {
    console.error("Error fetching certificate data:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// export async function setCertificateData(
//   studentId: number,
//   coursesPackageId: string
// ) {
//   try {
//     if (!studentId || !coursesPackageId) {
//      throw Error("there is no student or package");
//     }

//     const result = await prisma.finalExamResult.updateMany({
//       where: {
//         studentId,
//         packageId:coursesPackageId,
//       },
//       data: {
//         // certificateUrl: `${new Date().toISOString().replace(/[-:.]/g,"")}_certificate.pdf`,
//         certificateUrl: `${coursesPackageId}_certificate.pdf`,
//         dateOfDownloadingCertificate: new Date(),
//       },
//     });
//     console.log("resultofserverside", result);

//     return result;
//   } catch (error) {
//     console.error(error);
//     throw error;
//   }
// }
