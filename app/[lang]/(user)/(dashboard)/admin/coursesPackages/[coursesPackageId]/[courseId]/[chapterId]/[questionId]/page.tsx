import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import QuestionUpdateForm from "@/components/custom/admin/question-update-form"; // You need to create this component

const QuestionUpdatePage = async ({
  params,
}: {
  params: Promise<{
    coursesPackageId: string;
    courseId: string;
    chapterId: string;
    questionId: string;
  }>;
}) => {
  const { courseId, chapterId, coursesPackageId, questionId } = await params;
  // Fetch the question with options and answers
  const questionToUpdate = await prisma.question.findUnique({
  where: { id: questionId, chapterId: chapterId },
    include: {
      questionOptions: {
        select: {
          id: true,
          option: true,
        },
      },
      questionAnswer: {
        select: {
          id: true,
          answer: {select:{option:true,}},
        },
      },
    },
  });

  if (!questionToUpdate) {
    return redirect("/en");
  }

  return (
    <div className="mx-auto max-w-2xl overflow-y-auto p-6">
      <Link
        href={`/${"en"}/admin/coursesPackages/${coursesPackageId}/${courseId}/${chapterId}`}
        className="flex items-center text-sm hover:opacity-75 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Questions
      </Link>
      <h1 className="text-2xl font-bold mb-4">Update Question</h1>
      <div>
        <QuestionUpdateForm
          coursesPackageId={coursesPackageId}
          initialData={questionToUpdate}
          courseId={courseId}
          chapterId={chapterId}
          questionId={questionId}
          questionOptions={questionToUpdate.questionOptions.map(option => option.option)}
          questionAnswer={questionToUpdate.questionAnswer.map(answer => answer.answer.option)}
        />
      </div>
    </div>
  );
};

export default QuestionUpdatePage;
