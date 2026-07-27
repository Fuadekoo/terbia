// import { auth } from "@/auth";
import { ArrowLeft, LayoutDashboard, ListChecks } from "lucide-react";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { TitleForm } from "../../../../../../../components/custom/admin/title-form";
import { DescriptionForm } from "../../../../../../../components/custom/admin/description-form";
import { ThumbnailForm } from "../../../../../../../components/custom/admin/thumbnail-form";
// import { auth } from "@/auth";
// import { isTeacher } from "@/lib/teacher";
import { CoursesForm } from "@/components/custom/admin/courses-form";
import { Banner } from "@/components/custom/admin/banner";
import { CoursesPackageActions } from "@/components/custom/admin/courses-package-action";
import Link from "next/link";
// import StudentAssignmentForm from "@/components/custom/admin/student-assignment-form";
import AssignedStudentsList from "@/components/custom/admin/assigned-students-form";
import UstazSelector from "@/components/custom/admin/assign-oustaz-form";
import { cn } from "@/lib/utils";
// import { StudentSelectionForm } from "@/components/custom/student-selection-form";

const CoursesPackageIdPage = async ({
  params,
}: {
  params: Promise<{ coursesPackageId: string }>;
}) => {
  const { coursesPackageId } = await params;

  const coursesPackage = await prisma.coursePackage.findUnique({
    where: {
      id: coursesPackageId,
    },
    include: {
      courses: { include: { chapters: { select: { isPublished: true } } } },
    },
  });
  if (!coursesPackage) {
    return redirect("/en");
  }

  const requiredFields = [
    coursesPackage.name,
    // coursesPackage.description,
    // coursesPackage.userType,
    coursesPackage.courses,
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;
  const completionText = `(${completedFields}/${totalFields}) `;
  const isComplete = requiredFields.every(Boolean);
  const lang = "en";
  return (
    <div className="h-full overflow-auto">
      {/* Warning Banner */}
      {!coursesPackage.isPublished && (
        <Banner
          variant="warning"
          label="This Course is unpublished, It will not be visible in the package"
        />
      )}

      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${lang}/admin/coursesPackages`}
            className="focus-ring group mb-6 inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Course Packages
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <span className="text-sm font-bold">CP</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Course Package Setup
                  </h1>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Configure and manage your course package settings
                  </p>
                </div>
              </div>

              {/* Setup progress */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      isComplete ? "bg-success" : "bg-muted-foreground/35"
                    )}
                  />
                  <span className="text-sm font-medium">
                    Setup progress {completionText}
                  </span>
                </div>
                <div
                  className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={completedFields}
                  aria-valuemin={0}
                  aria-valuemax={totalFields}
                  aria-label="Course package setup progress"
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out-soft",
                      isComplete ? "bg-success" : "bg-primary"
                    )}
                    style={{
                      width: `${(completedFields / totalFields) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <CoursesPackageActions
                disabled={!isComplete}
                isPublished={coursesPackage.isPublished}
                coursesPackageId={coursesPackageId}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Left — package settings */}
          <div className="space-y-6">
            <section className="surface p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                  <LayoutDashboard className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">
                    Package Configuration
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Customize your course package details
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <TitleForm
                  initialData={coursesPackage}
                  coursesPackageId={coursesPackage.id}
                />
                <DescriptionForm
                  initialData={coursesPackage}
                  coursesPackageId={coursesPackage.id}
                />
                <ThumbnailForm
                  initialData={coursesPackage}
                  coursesPackageId={coursesPackage.id}
                />
              </div>
            </section>

            <section className="surface p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success/12 text-success-tint-fg">
                  <ListChecks className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">Assignment Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage ustaz and student assignments
                  </p>
                </div>
              </div>

              <UstazSelector coursesPackageId={coursesPackage.id} />
            </section>
          </div>

          {/* Right — course management */}
          <div className="space-y-6">
            <AssignedStudentsList coursesPackageId={coursesPackage.id} />

            <section className="surface p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-chart-4/15 text-chart-4">
                  <ListChecks className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">Course Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Add and organize courses in your package
                  </p>
                </div>
              </div>

              <CoursesForm
                initialData={coursesPackage}
                coursesPackageId={coursesPackage.id}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CoursesPackageIdPage;
