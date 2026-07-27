// import { auth } from "@/auth";
import { ArrowLeft, LayoutDashboard, ListChecks } from "lucide-react";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { IconBadge } from "@/components/icon-badge";

import { CourseTitleForm } from "@/components/custom/admin/course-title-form";
import { CourseDescriptionForm } from "@/components/custom/admin/course-description-form";
import Link from "next/link";
import { ChaptersForm } from "@/components/custom/admin/chapters-form";
import { Banner } from "@/components/custom/admin/banner";
import { CourseActions } from "@/components/custom/admin/course-action";

const CourseIdPage = async ({
  params,
}: {
  params: Promise<{ coursesPackageId: string; courseId: string }>;
}) => {
  const { courseId } = await params;
  const { coursesPackageId } = await params;

  const course = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
    include: {
      chapters: {
        include: { questions: { include: { questionOptions: true } } },
      },
    },
  });

  if (!course) {
    return redirect("/en");
  }

  const requiredFields = [
    course.title,
    // course.description,
    // course.imageUrl,
    course.chapters,
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;
  const completionText = `(${completedFields}/${totalFields}) `;
  const isComplete = requiredFields.every(Boolean);
  const lang = "en";
  return (
    <div className="grid overflow-hidden">
      {!course.isPublished && (
        <Banner
          variant="warning"
          label="This Course is unpublished, It will not be visible in the package"
        />
      )}

      <div className="p-4 md:p-6 overflow-auto scrollbar-hide">
        <Link
          href={`/${lang}/admin/coursesPackages/${coursesPackageId}`}
          className="flex items-center text-sm hover:opacity-75 transition mb-4 md:mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses Setup
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-y-1.5">
            <h1 className="text-2xl font-medium">Course Setup</h1>
            <span className="text-sm text-muted-foreground">
              Complete all fields {completionText}
            </span>
          </div>
          <CourseActions
            disabled={!isComplete}
            courseId={courseId}
            isPublished={course.isPublished}
            coursesPackageId={coursesPackageId}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
          <div className="space-y-6">
            <div className="flex items-center gap-x-2">
              <IconBadge icon={LayoutDashboard} />
              <h2 className="text-xl">Customize your Course</h2>
            </div>
            <CourseTitleForm
              initialData={course}
              coursesPackageId={coursesPackageId}
              courseId={courseId}
            />
            <CourseDescriptionForm
              initialData={course}
              coursesPackageId={coursesPackageId}
              courseId={course.id}
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-x-2">
              <IconBadge icon={ListChecks} />
              <h2 className="text-xl">Course Chapters</h2>
            </div>
            <ChaptersForm
              initialData={course}
              coursesPackageId={coursesPackageId}
              courseId={course.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default CourseIdPage;
