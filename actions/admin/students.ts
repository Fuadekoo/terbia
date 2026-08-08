/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import prisma from "@/lib/db";
import { auth } from "@/auth";

export interface AdminStudentRow {
  wdt_ID: number;
  name: string | null;
  phoneno: string | null;
  country: string | null;
  status: string | null;
  isKid: boolean | null;
  package: string | null;
  subject: string | null;
  ustazname: string | null;
  activePackageName: string | null;
}

export interface GetStudentsParams {
  search?: string;
  status?: string; // "all" | any status value
  page?: number;
  pageSize?: number;
}

export interface GetStudentsResult {
  success: boolean;
  error?: string;
  data?: {
    rows: AdminStudentRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    statuses: string[];
  };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return "No session found";
  if ((session.user as any).userType !== "admin") return "Admin access required";
  return null;
}

/** Paginated, searchable list of students for the admin students page. */
export async function getStudents(
  params: GetStudentsParams = {}
): Promise<GetStudentsResult> {
  try {
    const denied = await requireAdmin();
    if (denied) return { success: false, error: denied };

    const search = (params.search ?? "").trim();
    const status = params.status && params.status !== "all" ? params.status : undefined;
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 20));

    const searchAsId = Number(search);
    const where: any = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phoneno: { contains: search } },
              { package: { contains: search } },
              { subject: { contains: search } },
              ...(Number.isFinite(searchAsId) && search !== ""
                ? [{ wdt_ID: searchAsId }]
                : []),
            ],
          }
        : {}),
    };

    const [total, students, statusGroups] = await Promise.all([
      prisma.wpos_wpdatatable_23.count({ where }),
      prisma.wpos_wpdatatable_23.findMany({
        where,
        select: {
          wdt_ID: true,
          name: true,
          phoneno: true,
          country: true,
          status: true,
          isKid: true,
          package: true,
          subject: true,
          ustazdata: { select: { ustazname: true } },
          activePackage: { select: { name: true } },
        },
        orderBy: { wdt_ID: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.wpos_wpdatatable_23.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    return {
      success: true,
      data: {
        rows: students.map((s) => ({
          wdt_ID: s.wdt_ID,
          name: s.name,
          phoneno: s.phoneno,
          country: s.country,
          status: s.status,
          isKid: s.isKid,
          package: s.package,
          subject: s.subject,
          ustazname: s.ustazdata?.ustazname ?? null,
          activePackageName: s.activePackage?.name ?? null,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        statuses: statusGroups
          .map((g) => g.status)
          .filter((s): s is string => !!s)
          .sort(),
      },
    };
  } catch (error) {
    console.error("Error fetching students:", error);
    return { success: false, error: "Failed to fetch students" };
  }
}
