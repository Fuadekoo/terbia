import { PackageQuestionForm } from "@/components/custom/admin/package-question-form";
import prisma from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const QuestionsofThePackagePage = async ({
  params,
}: {
  params: Promise<{
    coursesPackageId: string;
  }>;
}) => {
  const { coursesPackageId } = await params;
  const coursepackage = await prisma.coursePackage.findUnique({
    where: {
      id: coursesPackageId,
    },
    include: {
      questions: {
        include: {
          questionOptions: true,
        },
      },
    },
  });

  if (!coursepackage) {
    return redirect("/en");
  }
  return (
    <div className="grid space-y-6 overflow-hidden p-6">
      <div>
        <Link
          href={`/en/admin/coursesPackages/${coursesPackageId}`}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Back to CoursesPackage setup"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to CoursesPackage setup
        </Link>
      </div>

      <PackageQuestionForm
        initialData={coursepackage}
        coursesPackageId={coursesPackageId}
      />
    </div>
  );
};
export default QuestionsofThePackagePage;
