import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LaptopIcon,
  UserCheckIcon,
  UserIcon,
  TrendingUp,
  Award,
  BarChart3,
} from "lucide-react";
import {
  PageShell,
  PageHeader,
  PageBody,
  StatCard,
} from "@/components/custom/common/page-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import StudentGraph from "./studetGraph";
import {
  getAllAssignedCoursePackages,
  getThePackagesWhichHasLargestStudent,
  getTotalStudentsThatHaveacessthePacakges,
} from "@/actions/admin/analysis";
import FinalExamStudentsGraph from "./finalExamStudentsGraph";

async function Page() {
  const largestCoursePackage = await getThePackagesWhichHasLargestStudent();
  const totalStudents = await getTotalStudentsThatHaveacessthePacakges();
  const totalPackages = await getAllAssignedCoursePackages();
  const takencoursePercent = 80;

  const topPackageName = largestCoursePackage
    .map((course) => course.packageName)
    .join(", ");

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Comprehensive platform analytics and insights"
        actions={
          <Link href="/en/admin/analytics/viewAll" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              <BarChart3 className="size-4" />
              <span className="hidden sm:inline">View Detailed Analytics</span>
              <span className="sm:hidden">View Details</span>
            </Button>
          </Link>
        }
      />

      <PageBody>
        {/* Summary */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-7 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          <StatCard
            label="Total Students"
            value={totalStudents}
            icon={UserIcon}
            tone="primary"
            hint="Active learners"
          />
          <StatCard
            label="Course Packages"
            value={totalPackages}
            icon={UserCheckIcon}
            tone="success"
            hint={`${takencoursePercent}% engagement`}
          />
          <StatCard
            label="Top Package"
            value={
              <span className="line-clamp-1 text-base sm:text-lg">
                {topPackageName || "—"}
              </span>
            }
            icon={Award}
            tone="info"
            hint="Most popular this month"
          />
        </div>

        {/* Charts */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:mb-7 sm:gap-5 lg:grid-cols-2">
          <Card className="gap-4 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
                  <LaptopIcon className="size-4" />
                </span>
                Student Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 sm:px-2">
              <StudentGraph />
            </CardContent>
          </Card>

          <Card className="gap-4 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg">
                <span className="grid size-8 place-items-center rounded-lg bg-success/12 text-success-tint-fg">
                  <BarChart3 className="size-4" />
                </span>
                Final Exam Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 sm:px-2">
              <FinalExamStudentsGraph />
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card className="border-primary/20 bg-primary/6">
          <CardContent>
            <div className="flex items-start gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                <TrendingUp className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold sm:text-lg">
                  Platform Insights
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Your platform has{" "}
                  <strong className="text-foreground">{totalStudents}</strong>{" "}
                  active students across{" "}
                  <strong className="text-foreground">{totalPackages}</strong>{" "}
                  course packages
                  {topPackageName ? (
                    <>
                      . The most popular package this month is{" "}
                      <strong className="text-primary">{topPackageName}</strong>
                    </>
                  ) : null}
                  .
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageBody>
    </PageShell>
  );
}

export default Page;
