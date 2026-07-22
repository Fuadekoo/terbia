"use server";
import prisma from "@/lib/db";
import { getStudentProgressStatus } from "@/actions/admin/analysis";

export async function getStudentAnalyticsperPackageForEachController(
  searchTerm?: string,
  currentPage?: number,
  itemsPerPage?: number,
  progressFilter?: "notstarted" | "inprogress" | "completed" | "all",
  controllerId?: string
) {
  // gate the code of login controller
  const code = await prisma.controller.findFirst({
    where: {
      wdt_ID: Number(controllerId),
    },
    select: {
      code: true,
    },
  });

  const page = currentPage && currentPage > 0 ? currentPage : 1;
  const take = itemsPerPage && itemsPerPage > 0 ? itemsPerPage : 10;
  const skip = (page - 1) * take;

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

  // 2. Build OR filter for students matching any subjectPackage
  const subjectPackageFilters = subjectPackages.map((sp) => ({
    subject: sp.subject,
    package: sp.packageType,
    isKid: sp.kidpackage,
  }));

  // 3. Build search filter
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

  // 4. Get ALL students (no skip/take here!)
  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      u_control: code?.code,
      status: { in: ["Active", "Not yet", "On progress", "terbia"] },
      OR: subjectPackageFilters,
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
      ustazdata: {
        select: { ustazname: true },
      },
    },
  });

  // 5. For each student, find their subjectPackage and get progress
  let studentsWithProgress = await Promise.all(
    students.map(async (student) => {
      // Find the subjectPackage for this student
      const matchedSubjectPackage = subjectPackages.find(
        (sp) =>
          sp.subject === student.subject &&
          sp.packageType === student.package &&
          sp.kidpackage === student.isKid
      );
      const activePackageId = matchedSubjectPackage?.packageId ?? "";

      const progress = await getStudentProgressStatus(
        student.wdt_ID,
        activePackageId
      );

      const activePackage = await prisma.coursePackage.findUnique({
        where: { id: activePackageId },
        select: { name: true },
      });

      // Format phone number: reverse, last 9 digits, add country code
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
        ustazname: student.ustazdata?.ustazname ?? "",
        tglink: `https://t.me/${phoneNo}`,
        whatsapplink: `https://wa.me/${phoneNo}`,
        isKid: student.isKid,
        chatid: student.chat_id,
        activePackage: activePackage?.name ?? "",
        studentProgress: progress,
      };
    })
  );

  // 6. Filter by progressFilter if provided and not "all"
  if (progressFilter && progressFilter !== "all") {
    studentsWithProgress = studentsWithProgress.filter((student) => {
      if (progressFilter === "inprogress") {
        return (
          student.studentProgress !== "completed" &&
          student.studentProgress !== "notstarted"
        );
      } else {
        return student.studentProgress === progressFilter;
      }
    });
  }

  // 7. Paginate after filtering
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
