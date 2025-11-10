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
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Warning Banner */}
      {!coursesPackage.isPublished && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/60">
          <Banner
            variant="warning"
            label="This Course is unpublished, It will not be visible in the package"
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          {/* Back Button */}
          <Link
            href={`/${lang}/admin/coursesPackages`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Course Packages
          </Link>

          {/* Title and Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/80 rounded-lg shadow-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">CP</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Course Package Setup
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Configure and manage your course package settings
                  </p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isComplete ? "bg-green-500" : "bg-gray-300"
                      }`}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">
                      Setup Progress {completionText}
                    </span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(completedFields / totalFields) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex-shrink-0">
              <CoursesPackageActions
                disabled={!isComplete}
                isPublished={coursesPackage.isPublished}
                coursesPackageId={coursesPackageId}
              />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column - Package Settings */}
          <div className="space-y-6">
            {/* Package Configuration Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LayoutDashboard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Package Configuration
                  </h2>
                  <p className="text-sm text-gray-600">
                    Customize your course package details
                  </p>
                </div>
              </div>

              <div className="space-y-6">
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
            </div>

            {/* Assignment Settings Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ListChecks className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Assignment Settings
                  </h2>
                  <p className="text-sm text-gray-600">
                    Manage ustaz and student assignments
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <UstazSelector coursesPackageId={coursesPackage.id} />
              </div>
            </div>
          </div>

          {/* Right Column - Course Management */}
          <div className="space-y-6">
            <div className="space-y-6">
              <AssignedStudentsList coursesPackageId={coursesPackage.id} />
            </div>
            {/* Course Management Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ListChecks className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Course Management
                  </h2>
                  <p className="text-sm text-gray-600">
                    Add and organize courses in your package
                  </p>
                </div>
              </div>

              <CoursesForm
                initialData={coursesPackage}
                coursesPackageId={coursesPackage.id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CoursesPackageIdPage;
