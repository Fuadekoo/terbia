"use server";
import prisma from "@/lib/db";
import { unlockTest } from "@/actions/student/unlocktest";
import {
  checkingUpdateProhibition,
  registerFinalExam,
  updateEndingExamTime,
} from "./finalExamResult";
// get a question for the specific chapter by pass the  wdt_ID packageid,courseid and chapterid help me
export async function getQuestionForActivePackageLastChapter(wdt_ID: number) {
  // get student
  const student = await prisma.wpos_wpdatatable_23.findFirst({
    where: {
      wdt_ID: wdt_ID,
      status: { in: ["Active", "Not yet", "On progress", "terbia"] },
    },
    select: {
      wdt_ID: true,
      activePackage: {
        select: {
          id: true,
          name: true,
          courses: {
            select: {
              id: true,
              title: true,
              order: true,
              chapters: {
                select: {
                  id: true,
                  position: true,
                  isPublished: true,
                },
                orderBy: {
                  position: "asc",
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });

  // display chapter data and question. rfistly gate the chapter id by compare the stuednttprogress with package active course and chapter.

  // const activecourse =

  if (!student) {
    console.error("Student not found or not authorized.");
    throw new Error("Unauthorized: Student not found.");
  }

  // 2. Get all student progress for this package
  const studentProgress = await prisma.studentProgress.findMany({
    where: {
      student: { wdt_ID: wdt_ID },
      chapter: {
        course: { packageId: student.activePackage?.id },
      },
    },
    select: { chapterId: true },
  });
  const completedChapterIds = studentProgress.map((p) => p.chapterId);

  // 3. Find the next chapter to work on
  let nextChapter = null;
  let currentCourse = null;

  for (const course of student.activePackage?.courses ?? []) {
    const courseChapterIds = course.chapters.map((ch) => ch.id);

    // Check if all chapters in this course are completed
    const allChaptersDone =
      courseChapterIds.length > 0 &&
      courseChapterIds.length ===
        courseChapterIds.filter((id) => completedChapterIds.includes(id))
          .length &&
      courseChapterIds.every((v) => completedChapterIds.includes(v));

    if (!allChaptersDone) {
      // Find the first incomplete chapter in this course
      for (const chapter of course.chapters) {
        if (!completedChapterIds.includes(chapter.id)) {
          nextChapter = chapter;
          currentCourse = course;
          break;
        }
      }
      if (nextChapter) break;
    }
  }

  // If all chapters are done, return null or a message
  if (!nextChapter) {
    return { message: "All chapters in the package are completed!" };
  }

  // Optionally, get full chapter data and questions
  const chapterData = await prisma.chapter.findUnique({
    where: { id: nextChapter.id },
    select: {
      id: true,
      title: true,
      description: true,
      videoUrl: true,
      position: true,
      questions: {
        select: {
          id: true,
          question: true,
          questionOptions: { select: { id: true, option: true } },
        },
      },
    },
  });

  const data = {
    packageId: student.activePackage?.id,
    packageName: student.activePackage?.name,
    courseId: currentCourse?.id,
    courseTitle: currentCourse?.title,
    chapter: chapterData,
  };
  // console.log(data);

  return data;
}

//   // gate the last active chapter
//   const lastActiveChapter = await prisma.studentProgress.findFirst({
//     where: {
//       studentId: student.wdt_ID,
//       isCompleted: true,
//       chapter: { course: { packageId: student.activePackage?.id } },
//     },
//     select: {
//       chapterId: true,
//     },
//   });

//   const chapterData = await prisma.chapter.findFirst({
//     where: {
//       id: lastActiveChapter?.chapterId,
//     },
//   });
// }

// export async function getQuestionForActivePackageLastChapter(wdt_ID: string) {
//   // Find the student
//   const student = await prisma.wpos_wpdatatable_23.findFirst({
//     where: {
//       chat_id: wdt_ID,
//       status: { in: ["Active", "Not yet", "On progress", "terbia"] },
//     },
//     select: {
//       wdt_ID: true,
//       activePackage: {
//         select: {
//           id: true,
//           name: true,
//           courses: {
//             select: {
//               id: true,
//               order: true,
//               chapters: {
//                 select: {
//                   id: true,
//                   position: true,
//                   isPublished: true,
//                 },
//                 orderBy: {
//                   position: "asc",
//                 },
//               },
//             },
//             orderBy: {
//               order: "asc",
//             },
//           },
//         },
//       },
//     },
//   });

//   if (!student || !student.activePackage) {
//     console.error("Student or active package not found");
//     throw new Error("Unauthorized: Student or package not found.");
//   }

//   // Get all completed chapters for this student in this package
//   const completedChapters = await prisma.studentProgress.findMany({
//     where: {
//       studentId: student.wdt_ID,
//       isCompleted: true,
//       chapter: {
//         course: {
//           packageId: student.activePackage.id,
//         },
//       },
//     },
//     select: {
//       chapterId: true,
//     },
//   });

//   const completedChapterIds = completedChapters.map((c) => c.chapterId);

//   // Find the next chapter in order
//   let nextChapter = null;
//   let currentCourse = null;

//   // Iterate through courses in order
//   for (const course of student.activePackage.courses) {
//     currentCourse = course;

//     // Check if all chapters in this course are completed
//     const allChaptersCompleted = course.chapters.every((chapter) =>
//       completedChapterIds.includes(chapter.id)
//     );

//     // If not all chapters are completed, find the first incomplete chapter
//     if (!allChaptersCompleted) {
//       for (const chapter of course.chapters) {
//         if (!completedChapterIds.includes(chapter.id)) {
//           nextChapter = chapter;
//           break;
//         }
//       }
//       if (nextChapter) break;
//     }
//   }

//   if (!nextChapter) {
//     // If all chapters are completed, return the first chapter of the first course
//     if (
//       student.activePackage.courses.length > 0 &&
//       student.activePackage.courses[0].chapters.length > 0
//     ) {
//       nextChapter = student.activePackage.courses[0].chapters[0];
//     } else {
//       throw new Error("No chapters available in this package.");
//     }
//   }

//   // Get the full chapter data with questions
//   const chapterWithQuestions = await prisma.chapter.findUnique({
//     where: { id: nextChapter.id },
//     include: {
//       questions: {
//         include: {
//           questionOptions: true,
//           questionAnswer: true,
//         },
//       },
//     },
//   });

//   if (!chapterWithQuestions) {
//     throw new Error("Chapter not found.");
//   }

//   return {
//     chapter: {
//       id: chapterWithQuestions.id,
//       title: chapterWithQuestions.title,
//       description: chapterWithQuestions.description,
//       videoUrl: chapterWithQuestions.videoUrl,
//       position: chapterWithQuestions.position,
//     },
//     questions: chapterWithQuestions.questions.map((q) => ({
//       id: q.id,
//       question: q.question,
//       options: q.questionOptions.map((opt) => ({
//         id: opt.id,
//         option: opt.option,
//       })),
//       correctAnswer:
//         q.questionAnswer.length > 0 ? q.questionAnswer[0].answerId : null,
//     })),
//     course: currentCourse
//       ? {
//           id: currentCourse.id,
//           order: currentCourse.order,
//         }
//       : null,
//   };
// }

// Get all questions answerfor a specific chapter
export async function showAnswer(chapterId: string) {
  // console.log("Fetching questions for chapterId:", chapterId);
  const questions = await prisma.question.findMany({
    where: { chapterId },
    select: { id: true },
  });

  if (!questions.length) {
    console.error("No questions found for chapterId:", chapterId);
    throw new Error("No questions found for the given chapterId.");
  }

  const questionIds = questions.map((q) => q.id);

  // console.log("Fetching correct answers for questions:", questionIds);

  const questionAnswersRaw = await prisma.questionAnswer.findMany({
    where: { questionId: { in: questionIds } },
    select: { questionId: true, answerId: true },
  });

  const studentAnswersRaw = await prisma.studentQuizAnswer.findMany({
    where: {
      selectedOption: {
        questionId: { in: questionIds },
      },
    },
    select: {
      studentQuiz: { select: { questionId: true } },
      selectedOptionId: true,
    },
  });

  // Group student answers by questionId
  const studentResponse: { [questionId: string]: string[] } = {};
  for (const ans of studentAnswersRaw) {
    const qid = ans.studentQuiz.questionId;
    if (!studentResponse[qid]) studentResponse[qid] = [];
    studentResponse[qid].push(ans.selectedOptionId);
  }

  // Group correct answers by questionId
  const questionAnswers: { [questionId: string]: string[] } = {};
  for (const qa of questionAnswersRaw) {
    if (!questionAnswers[qa.questionId]) questionAnswers[qa.questionId] = [];
    questionAnswers[qa.questionId].push(qa.answerId);
  }

  // Combine questionAnswers and studentResponse per questionId
  const combinedAnswers = questionIds.map((id) => ({
    questionId: id,
    correctAnswers: questionAnswers[id] || [],
    studentAnswers: studentResponse[id] || [],
  }));

  // console.log("Combined answers:", combinedAnswers);

  return combinedAnswers;
}

// type AnswerPair = { questionId: string; answerId: string };

// export async function submitAnswers(answers: AnswerPair[]) {
//   if (!answers.length) throw new Error("No answers provided.");
// }

// export async function getStudentSubmittedAnswers(questionId: string) {
//   const studentId = await isAuthorized("student");
//   if (!studentId) throw new Error("Unauthorized: Student ID is undefined");
// }

// export async function checkAnswerSubmitted(questionId: string) {
//   const studentId = await isAuthorized("student");
//   if (!studentId) throw new Error("Unauthorized: Student ID is undefined");
// }

// this function is used to check the correct answer for a specific chapter
export async function correctAnswer(chapterId: string, studentId: number) {
  try {
    // console.log("Fetching questions for chapterId:", chapterId);
    const questions = await prisma.question.findMany({
      where: { chapterId },
      select: { id: true },
    });

    if (!questions.length) {
      console.error("No questions found for chapterId:", chapterId);
      return null;
    }

    const questionIds = questions.map((q) => q.id);

    // console.log("Fetching student quiz answers for studentId:", studentId);
    const studentQuizAnswers = await prisma.studentQuizAnswer.findMany({
      where: {
        studentQuiz: {
          studentId: studentId,
          questionId: { in: questionIds },
          isFinalExam: false,
        },
      },
      select: {
        studentQuiz: { select: { questionId: true } },
        selectedOptionId: true,
      },
    });

    const studentResponse: { [questionId: string]: string[] } = {};
    for (const ans of studentQuizAnswers) {
      const qid = ans.studentQuiz.questionId;
      if (!studentResponse[qid]) studentResponse[qid] = [];
      studentResponse[qid].push(ans.selectedOptionId);
    }

    // console.log("Fetching correct answers for questions:", questionIds);
    const questionAnswersRaw = await prisma.questionAnswer.findMany({
      where: { questionId: { in: questionIds } },
      select: { questionId: true, answerId: true },
    });

    const questionAnswers: { [questionId: string]: string[] } = {};
    for (const qa of questionAnswersRaw) {
      if (!questionAnswers[qa.questionId]) questionAnswers[qa.questionId] = [];
      questionAnswers[qa.questionId].push(qa.answerId);
    }

    const total = questionIds.length;
    let correct = 0;

    for (const questionId of questionIds) {
      const correctAnswers = questionAnswers[questionId]?.sort() || [];
      const userAnswers = studentResponse[questionId]?.sort() || [];
      const isCorrect =
        correctAnswers.length === userAnswers.length &&
        correctAnswers.every((v, i) => v === userAnswers[i]);
      if (isCorrect) correct++;
    }

    const result = {
      total,
      correct,
      score: total ? correct / total : 0,
    };

    console.log("Result calculated:", result);
    return { studentResponse, questionAnswers, result };
  } catch (error) {
    console.error("Error in correctAnswer:", error);
    throw new Error("Failed to calculate the correct answers.");
  }
}

type AnswerPair = { questionId: string; answerId: string[] };

export async function submitAnswers(
  answers: AnswerPair[],
  wdt_ID: number,
  courseId: string,
  chapterId: string
) {
  // if (!answers.length) throw new Error("No answers provided.");

  const results = [];
  const student = await prisma.wpos_wpdatatable_23.findFirst({
    where: {
      wdt_ID: wdt_ID,
      status: { in: ["Active", "Not yet", "On progress", "terbia"] },
    },
    select: {
      wdt_ID: true,
      packages: { select: { id: true } },
    },
  });

  // const packageId = student?.packages[0]?.id;

  if (!student || !student.wdt_ID) {
    throw new Error("Student not found or not authorized.");
  }
  const studentId = student.wdt_ID;
  for (const { questionId, answerId } of answers) {
    // Find or create the studentQuiz record for this student and question
    let studentQuiz = await prisma.studentQuiz.findFirst({
      where: { studentId, questionId, isFinalExam: false },
    });

    if (!studentQuiz) {
      studentQuiz = await prisma.studentQuiz.create({
        data: { studentId, questionId },
      });
    }

    // Check if an answer already exists for this studentQuiz
    const existingAnswer = await prisma.studentQuizAnswer.findMany({
      where: {
        studentQuizId: studentQuiz.id,
      },
    });

    if (!existingAnswer || existingAnswer.length === 0) {
      // console.log("new answer", existingAnswer);
      for (const ansId of answerId) {
        await prisma.studentQuizAnswer.create({
          data: {
            studentQuizId: studentQuiz.id,
            selectedOptionId: ansId,
          },
        });
      }
    } else {
      // Remove any previous answers for this question (if single-answer)
      await prisma.studentQuizAnswer.deleteMany({
        where: { studentQuizId: studentQuiz.id },
      });
      for (const ansId of answerId) {
        await prisma.studentQuizAnswer.create({
          data: {
            studentQuizId: studentQuiz.id,
            selectedOptionId: ansId,
          },
        });
      }
    }
    // Create new answers

    const newAnswer = await prisma.studentQuizAnswer.findMany({
      where: {
        studentQuizId: studentQuiz.id,
        selectedOptionId: { in: answerId },
      },
    });
    results.push(newAnswer);
  }

  const score = await correctAnswer(chapterId, studentId);
  // if the the score is above 0.75 then excite the unlock test  else  display message only

  if (score?.result.score === 1 || !score) {
    await unlockTest(wdt_ID, courseId, chapterId);
  } else {
    console.log("Score below threshold, not unlocking test.");
  }

  console.log("Answers submitted successfully:", results);
  return { success: true, submitted: results.length };
}

export async function correctExamAnswer(
  coursesPackageId: string,
  studentId: number
) {
  try {
    const questions = await prisma.question.findMany({
      where: { packageId: coursesPackageId },
      select: { id: true },
    });

    if (!questions.length) {
      console.error(
        "No questions found for coursesPackageId:",
        coursesPackageId
      );
    }

    const questionIds = questions.map((q) => q.id);
    const studentQuiz = await prisma.studentQuiz.findMany({
      where: {
        studentId: studentId,
        questionId: { in: questionIds },
        isFinalExam:true,
      },
      select: {
        id:true,
      },
    });
    if(!studentQuiz){
      console.log("there is no students queiz");
      return undefined;
    }
    console.log("Fetching student quiz answers for studentId:", studentId);
    const studentQuizAnswers = await prisma.studentQuizAnswer.findMany({
      where: {
        studentQuiz: {
          studentId: studentId,
          questionId: { in: questionIds },
          isFinalExam: true,
        },
      },
      select: {
        studentQuiz: { select: { questionId: true } },
        selectedOptionId: true,
      },
    });
    if (!studentQuizAnswers) {
      console.log("there is no studentsanswer for the exam");
      return undefined;
    }
    const studentResponse: { [questionId: string]: string[] } = {};
    for (const ans of studentQuizAnswers) {
      const qid = ans.studentQuiz.questionId;
      if (!studentResponse[qid]) studentResponse[qid] = [];
      studentResponse[qid].push(ans.selectedOptionId);
    }

    console.log("Fetching correct answers for questions:", questionIds);
    const questionAnswersRaw = await prisma.questionAnswer.findMany({
      where: { questionId: { in: questionIds } },
      select: { questionId: true, answerId: true },
    });

    const questionAnswers: { [questionId: string]: string[] } = {};
    for (const qa of questionAnswersRaw) {
      if (!questionAnswers[qa.questionId]) questionAnswers[qa.questionId] = [];
      questionAnswers[qa.questionId].push(qa.answerId);
    }

    const total = questionIds.length;
    let correct = 0;

    for (const questionId of questionIds) {
      const correctAnswers = questionAnswers[questionId]?.sort() || [];
      const userAnswers = studentResponse[questionId]?.sort() || [];
      const isCorrect =
        correctAnswers.length === userAnswers.length &&
        correctAnswers.every((v, i) => v === userAnswers[i]);
      if (isCorrect) correct++;
    }

    const result = {
      total,
      correct,
      score: correct / total ? correct / total : 0,
    };

    console.log("Exam Result calculated:", result);
    return { studentResponse:await studentResponse, questionAnswers, result };
  } catch (error) {
    console.error("Error in correctAnswer:", error);
    throw new Error("Failed to calculate the correct answers.");
  }
}

export async function examsubmitAnswers(
  answers: AnswerPair[],
  wdt_ID: number,
  coursesPackageId: string
) {
  if (!answers.length) throw new Error("No answers provided.");

  const results = [];
  const student = await prisma.wpos_wpdatatable_23.findFirst({
    where: {
      wdt_ID: wdt_ID,
      status: { in: ["Active", "Not yet", "On progress", "terbia"] },
      youtubeSubject: coursesPackageId,
    },
    select: {
      wdt_ID: true,
      packages: { select: { id: true } },
    },
  });

  // const packageId = student?.packages[0]?.id;

  if (!student || !student.wdt_ID) {
    throw new Error("Student not found or not authorized.");
  }
  const studentId = student.wdt_ID;

  //registering final Exam Result

  for (const { questionId, answerId } of answers) {
    // Find or create the studentQuiz record for this student and question
    let studentQuiz = await prisma.studentQuiz.findFirst({
      where: { studentId, questionId, isFinalExam: true },
    });

    if (!studentQuiz) {
      studentQuiz = await prisma.studentQuiz.create({
        data: { studentId, questionId, isFinalExam: true },
      });
      await registerFinalExam(studentId, coursesPackageId);
    }

    // Check if an answer already exists for this studentQuiz
    const existingAnswer = await prisma.studentQuizAnswer.findMany({
      where: {
        studentQuizId: studentQuiz.id,
      },
      select: { selectedOptionId: true },
    });

    if (!existingAnswer || existingAnswer.length === 0) {
      // console.log("new answer", existingAnswer);
      if (
        (await checkingUpdateProhibition(studentId, coursesPackageId)) === false
      ) {
        for (const ansId of answerId) {
          await prisma.studentQuizAnswer.create({
            data: {
              studentQuizId: studentQuiz.id,
              selectedOptionId: ansId,
            },
          });
        }
        await registerFinalExam(studentId, coursesPackageId);
        await updateEndingExamTime(studentId, coursesPackageId);
      }
    } else {
      // Remove any previous answers for this question (if single-answer)
      if (
        (await checkingUpdateProhibition(studentId, coursesPackageId)) === false
      ) {
        await prisma.studentQuizAnswer.deleteMany({
          where: { studentQuizId: studentQuiz.id },
        });
        for (const ansId of answerId) {
          await prisma.studentQuizAnswer.create({
            data: {
              studentQuizId: studentQuiz.id,
              selectedOptionId: ansId,
            },
          });
        }
        await registerFinalExam(studentId, coursesPackageId);
        await updateEndingExamTime(studentId, coursesPackageId);
      }
    }
    // Create new answers

    const newAnswer = await prisma.studentQuizAnswer.findMany({
      where: {
        studentQuizId: studentQuiz.id,
        selectedOptionId: { in: answerId },
      },
    });
    results.push(newAnswer);
  }

  // const score = await correctExamAnswer(coursesPackageId, studentId);
  // // if the the score is above 0.75 then excite the unlock test  else  display message only

  // if (score.result.score === 1) {
  //   await unlockTest(wdt_ID, courseId, chapterId);
  // } else {
  //   console.log("Score below threshold, not unlocking test.");
  // }
  if (
    (await checkingUpdateProhibition(studentId, coursesPackageId)) === false
  ) {
    console.log("Answers submitted successfully:", results);
    return { success: true, submitted: results.length };
  } else {
    return;
  }
  // return score;
}
