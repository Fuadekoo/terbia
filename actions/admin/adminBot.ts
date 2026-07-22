"use server";
import prisma from "@/lib/db";

export async function allPackages() {
  // Get all packages
  const packages = await prisma.coursePackage.findMany({
    select: {
      id: true,
      name: true,
      // Add other fields if needed
    }
  });

  // For each package, count students assigned via subjectPackage
  const result = await Promise.all(
    packages.map(async (pkg) => {
      // Get all subjectPackages for this package
      const subjectPackages = await prisma.subjectPackage.findMany({
        where: { packageId: pkg.id },
        select: {
          subject: true,
          packageType: true,
          kidpackage: true,
        },
      });

      // Build OR filter for wpos_wpdatatable_23
      const orFilters = subjectPackages.map(sp => ({
        subject: sp.subject,
        package: sp.packageType,
        isKid: sp.kidpackage,
      }));

      // Count students in wpos_wpdatatable_23 matching any subjectPackage
      const totalStudents = orFilters.length
        ? await prisma.wpos_wpdatatable_23.count({
            where: { 
              status: { in: ["Active", "Not yet", "On progress", "terbia"] },
              OR: orFilters }
          })
        : 0;

      return {
        ...pkg,
        totalStudents,
      };
    })
  );

  return result;
}

export async function getStudentById(id:number){
    // Get student by ID
    const student = await prisma.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: id,
          status: { in: ["Active", "Not yet", "On progress", "terbia"] },
         },
        select: {
        name: true,
        chat_id: true,
        },
    });
    
    return student;
}