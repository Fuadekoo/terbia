"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import useAction from "@/hooks/useAction";
import { correctAnswer, submitAnswers } from "@/actions/student/question";
import { getstudentId } from "@/actions/student/dashboard";
import { updatePathProgressData } from "@/actions/student/progress";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
// import { useMainMenu } from "@/app/[lang]/(user)/student/layout";
import AnimatedCircularProgress from "./animatedcountdownprogress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

// SVG Icons
const CheckIcon = () => (
  <svg
    className="w-5 h-5 text-green-600 inline ml-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg
    className="w-5 h-5 text-red-600 inline ml-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

interface StudentQuestionFormProps {
  chapter: {
    questions: {
      id: string;
      question: string;
      questionOptions: { id: string; option: string }[];
    }[];
  } | null;

  wdt_ID: number;

  courseId: string;
  chapterId: string;
  themeColors?: {
    bg: string;
    text: string;
    hint: string;
    link: string;
    button: string;
    buttonText: string;
    secondaryBg: string;
  };
}

const StudentQuestionForm = ({
  chapter,

  wdt_ID,

  courseId,
  chapterId,
  themeColors,
}: StudentQuestionFormProps) => {
  // Use Telegram theme colors or defaults
  const bgColor = themeColors?.bg || "#ffffff";
  const textColor = themeColors?.text || "#000000";
  const linkColor = themeColors?.link || "#0ea5e9";
  const secondaryBg = themeColors?.secondaryBg || "#f3f4f6";

  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string[]>
  >({});
  const [showCorrect, setShowCorrect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(30);
  const router = useRouter();
  interface Feedback {
    studentResponse?: Record<string, string[]>;
    questionAnswers?: Record<string, string[]>;
    result?: { score: number; correct: number; total: number };
  }

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [getStudentById] = useAction(
    getstudentId,
    [true, (response) => console.log(response)],

    wdt_ID
  );
  const [progressData, refreshProgress] = useAction(
    updatePathProgressData,
    [true, (response) => console.log(response)],

    wdt_ID
  );
  const [, refetchSubmit, submitLoading] = useAction(submitAnswers, [
    ,
    async () => {
      toast.success("Answers submitted!", {
        style: { background: "#10B981", color: "#fff" },
      });
      await fetchCorrectAnswers();
      setShowCorrect(true);
      if (feedback?.result?.score === 1) {
        toast.success("Next chapter unlocked!", {
          style: { background: "#10B981", color: "#fff" },
        });
      }
      refreshProgress?.();
      refresh();
    },
  ]);
  // const { refresh } = useMainMenu();
  const refresh = () => {}; // Placeholder function

  // Timer for retry after incorrect answers
  useEffect(() => {
    if (showCorrect && feedback?.result?.score !== 1) {
      if (count === 0) {
        setCount(30);
        setShowCorrect(false);
        setSelectedAnswers({});
        setFeedback(null);
        return;
      }
      const timer = setInterval(() => {
        setCount((prev) => (prev >= 1 ? prev - 1 : prev));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [count, showCorrect, feedback]);

  const studentIdString = String(getStudentById) || "";

  async function fetchCorrectAnswers() {
    try {
      const res = await correctAnswer(chapterId, Number(studentIdString));
      setFeedback(res);
      setError(null);
    } catch (err) {
      setError("Failed to fetch correct answers.");
      console.error(err);
    }
  }

  // Handle checkbox change
  const handleOptionChange = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => {
      const prevSelected = prev[questionId] || [];
      if (prevSelected.includes(optionId)) {
        return {
          ...prev,
          [questionId]: prevSelected.filter((id) => id !== optionId),
        };
      }
      return { ...prev, [questionId]: [...prevSelected, optionId] };
    });
    console.log("Selected answers in option change", selectedAnswers);
  };

  async function handleSubmit() {
    if (!chapter) {
      setError("No questions available.");
      return;
    }
    const answers = Object.entries(selectedAnswers).flatMap(
      ([questionId, answerId]) => ({ questionId, answerId })
    );
    console.log("Selected answers in handle submit", answers);

    try {
      const an = refetchSubmit(answers, wdt_ID, courseId, chapterId);
      if (an === undefined && progressData) {
        router.push(
          `/en/student/${wdt_ID}/${progressData[0]}/${progressData[1]}`
        );
        console.log("Answer", an);
      }
    } catch (e) {
      setError("Failed to submit answers.");
      toast.error("Failed to submit answers.", {
        style: { background: "#EF4444", color: "#fff" },
      });
      console.error(e);
    }
  }

  const allAnswered =
    chapter?.questions.every(
      (q) => selectedAnswers[q.id] && selectedAnswers[q.id].length > 0
    ) ?? false;

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const feedbackVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      className="flex flex-col gap-2 py-2 md:px-8"
      style={{ background: bgColor, color: textColor }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {chapter?.questions.length ? (
        <TooltipProvider>
          <div className="space-y-0 flex-1 max-md:overflow-y-auto md:max-h-dvh">
            <AnimatePresence>
              {chapter.questions.map((question, index) => (
                <motion.div
                  key={question.id}
                  className="py-2"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <h3 
                    className="text-base md:text-lg font-semibold"
                    style={{ color: textColor }}
                  >
                    {index + 1}. {question.question}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {question.questionOptions.map((option) => {
                      const isSelected = (
                        selectedAnswers[question.id] || []
                      ).includes(option.id);
                      const isStudentSelected = feedback?.studentResponse?.[
                        question.id
                      ]?.includes(option.id);
                      const isCorrectOption = feedback?.questionAnswers?.[
                        question.id
                      ]?.includes(option.id);

                      let optionStyle: React.CSSProperties = {
                        padding: "12px",
                        border: `2px solid ${secondaryBg}`,
                        borderRadius: "8px",
                        transition: "all 0.2s",
                        background: secondaryBg,
                        color: textColor,
                        cursor: showCorrect ? "default" : "pointer",
                      };
                      let icon = null;

                      if (showCorrect && feedback) {
                        if (isStudentSelected && isCorrectOption) {
                          optionStyle = {
                            ...optionStyle,
                            background: "#dcfce7",
                            borderColor: "#22c55e",
                            color: "#166534",
                            fontWeight: 600,
                          };
                          icon = <CheckIcon />;
                        } else if (isStudentSelected && !isCorrectOption) {
                          optionStyle = {
                            ...optionStyle,
                            background: "#fee2e2",
                            borderColor: "#ef4444",
                            color: "#991b1b",
                            fontWeight: 600,
                          };
                          icon = <XIcon />;
                        } else if (!isStudentSelected && isCorrectOption) {
                          optionStyle = {
                            ...optionStyle,
                            background: "#fef3c7",
                            borderColor: "#facc15",
                            color: "#166534",
                          };
                          icon = <CheckIcon />;
                        }
                      } else if (isSelected) {
                        optionStyle = {
                          ...optionStyle,
                          borderColor: linkColor,
                          background: `${linkColor}20`,
                          color: textColor,
                          fontWeight: 600,
                        };
                      }

                      return (
                        <motion.li
                          key={option.id}
                          style={optionStyle}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded accent-sky-600 hidden"
                                  name={`question-${question.id}`}
                                  value={option.id}
                                  checked={isSelected}
                                  onChange={() =>
                                    handleOptionChange(question.id, option.id)
                                  }
                                  disabled={showCorrect}
                                  aria-label={`Option: ${option.option}`}
                                />
                                <span className="flex-1">{option.option}</span>
                                {showCorrect && icon}
                              </label>
                            </TooltipTrigger>
                            <TooltipContent>
                              {showCorrect
                                ? isCorrectOption
                                  ? "Correct answer"
                                  : isStudentSelected
                                  ? "Incorrect answer"
                                  : "Not selected"
                                : "Select this option"}
                            </TooltipContent>
                          </Tooltip>
                        </motion.li>
                      );
                    })}
                  </ul>
                </motion.div>
              ))}
            </AnimatePresence>
            {error && (
              <motion.div
                className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2"
                variants={feedbackVariants}
                initial="hidden"
                animate="visible"
              >
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
                <Button
                  variant="ghost"
                  onClick={() =>
                    refetchSubmit(
                      Object.entries(selectedAnswers).flatMap(
                        ([questionId, answerId]) => ({
                          questionId,
                          answerId,
                        })
                      ),

                      wdt_ID,

                      courseId,
                      chapterId
                    )
                  }
                  className="ml-auto text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
                  aria-label="Retry submission"
                >
                  Retry
                </Button>
              </motion.div>
            )}

            <motion.div
              className="mt-6 flex max-md:flex-col items-center gap-4 p-4 bg-gradient-to-t from-white/30 to-transparent dark:from-sky-900/30 dark:to-transparent rounded-lg shadow-sm"
              variants={feedbackVariants}
              initial="hidden"
              animate="visible"
              role="region"
              aria-label="Quiz actions"
            >
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || showCorrect || submitLoading}
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-base py-2 px-6 rounded-md shadow-md transition-all duration-200 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                aria-label="Submit answers"
              >
                {submitLoading ? (
                  <Loader2 className="animate-spin mr-2 w-4 h-4" />
                ) : null}
                መልሱን ይላኩ
              </Button>
              {showCorrect && feedback?.result?.score === 1 && progressData ? (
                <Button
                  asChild
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold text-base py-2 px-6 rounded-md shadow-md transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  aria-label="Go to next chapter"
                >
                  <Link
                    href={`/en/student/${wdt_ID}/${progressData[0]}/${progressData[1]}`}
                  >
                    ወደ ቀጣይ ክፍል ይሂዱ
                  </Link>
                </Button>
              ) : showCorrect && feedback?.result?.score !== 1 ? (
                <motion.div
                  className="flex max-md:flex-col items-center gap-3 bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-md border border-red-200 dark:border-red-800 shadow-sm"
                  variants={feedbackVariants}
                  initial="hidden"
                  animate="visible"
                  role="alert"
                  aria-live="polite"
                >
                  <span className="text-red-600 dark:text-red-400 font-semibold text-sm leading-tight">
                    ፈተናውን ወድቀዋል! መልሱ በመታየት ላይ ነው፡፡ እባከዎ ሰከንዱ እንዳለቀ እንደገና ይሞክሩ{" "}
                    {count}.
                  </span>
                  <AnimatedCircularProgress count={count} />
                </motion.div>
              ) : null}
            </motion.div>
          </div>
        </TooltipProvider>
      ) : (
        <>
          <motion.p
            className="text-sm text-gray-500  dark:text-gray-400 italic text-center"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <span className="">ለዚህ ክፍል ጥያቄ አልተቀመጥለትም፡፡</span>
          </motion.p>
          <Button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold text-base py-2 px-6 rounded-md shadow-md transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Go to next chapter"
          >
            ወደ ቀጣይ ክፍል ይሂዱ
          </Button>
        </>
      )}
    </motion.div>
  );
};

export default StudentQuestionForm;
