"use client";

import React from "react";
import MenuTitle from "./menu-title";
import { LightDarkToggle } from "@/components/ui/light-dark-toggle";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  PlayCircle,
  Lock,
  Trophy,
  UserCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getStudentProgressPerChapter,
  isCompletedAllChaptersInthePackage,
} from "@/actions/student/progress";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Loading from "../admin/loading";

interface MainMenuProps {
  data:
    | {
        wdt_ID: number;
        name: string | null;
        status: string | null;
        subject: string | null;
        activePackage: {
          name: string;
          id: string;
          courses: {
            id: string;
            title: string;
            order: number;
            chapters: {
              id: string;
              isPublished: boolean;
              title: string;
              position: number;
            }[];
          }[];
        } | null;
      }
    | null
    | undefined;
  className?: string;
}

export default function MainMenu({ data, className }: MainMenuProps) {
  const params = useParams();
  const router = useRouter();
  const wdt_ID = Number(params?.wdt_ID);

  const [chapterProgress, setChapterProgress] = React.useState<
    Record<string, boolean | null>
  >({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [allCoursesCompleted, setAllCoursesCompleted] = React.useState(false);

  React.useEffect(() => {
    async function fetchAllProgress() {
      if (!data || !data.activePackage) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const allChapters = data.activePackage.courses.flatMap(
          (course) => course.chapters
        );
        const progressEntries = await Promise.all(
          allChapters.map(async (chapter) => {
            const result = await getStudentProgressPerChapter(
              chapter.id,
              wdt_ID
            );
            return [chapter.id, result?.isCompleted ?? null] as [
              string,
              boolean | null
            ];
          })
        );
        setChapterProgress(Object.fromEntries(progressEntries));
        const areAllChaptersTrulyCompleted =
          await isCompletedAllChaptersInthePackage(
            data.activePackage.id,
            data.wdt_ID
          );
        setAllCoursesCompleted(areAllChaptersTrulyCompleted);
      } catch (error) {
        console.error("Error fetching progress:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllProgress();
  }, [data, wdt_ID]);

  const getCourseProgress = (chapters: { id: string }[]) => {
    const totalChapters = chapters.length;
    const completedChapters = chapters.filter(
      (chapter) => chapterProgress[chapter.id] === true
    ).length;
    return totalChapters > 0
      ? Math.round((completedChapters / totalChapters) * 100)
      : 0;
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const finalExamPackageId = data?.activePackage?.id;
  const canOpenFinalExam =
    allCoursesCompleted && !!data?.wdt_ID && !!finalExamPackageId;

  const handleFinalExamClick = () => {
    // Guarded so a missing package id can never produce `/finalexam/undefined`.
    if (!canOpenFinalExam) return;
    router.push(`/en/student/${data!.wdt_ID}/finalexam/${finalExamPackageId}`);
  };

  return (
    <nav
      className={cn(
        "overflow-y-hidden py-4 px-2 flex flex-col gap-4 bg-gradient-to-b from-sky-50 to-sky-100 dark:from-sky-900 dark:to-sky-950 shadow transition-all duration-300",
        className
      )}
      aria-label="Main navigation"
    >
      <header className="border-b border-sky-200 dark:border-sky-800 pb-2 mb-2">
        <MenuTitle
          title={data?.name || "Student"}
          subtitle={data?.subject || ""}
          showBadge={!!data?.activePackage}
          badgeText={data?.status || ""}
          badgeVariant="premium"
          className="text-base"
        />
      </header>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loading />
          </div>
        ) : !data || !data.activePackage ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No active package found.
          </div>
        ) : (
          <>
            <motion.h3
              className="text-base font-semibold text-sky-800 dark:text-sky-100 mb-3"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              {data.activePackage.name}
            </motion.h3>
            <TooltipProvider>
              <Accordion type="single" collapsible className="space-y-2 w-full">
                <AnimatePresence>
                  {data.activePackage.courses.map((course) => (
                    <motion.div
                      key={course.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      <AccordionItem
                        value={`course-${course.id}`}
                        className={cn(
                          "border border-sky-200 dark:border-sky-800 rounded-lg bg-white/80 dark:bg-sky-900/80 shadow-sm"
                        )}
                      >
                        <AccordionTrigger
                          className={cn(
                            "px-3 py-2 text-sm font-semibold text-sky-800 dark:text-sky-200 hover:bg-sky-100/50 dark:hover:bg-sky-800/50 rounded-t-lg"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sky-600 dark:text-sky-400 font-bold">
                              {course.order}.
                            </span>
                            <span className="truncate">{course.title}</span>
                            <span className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400">
                              {getCourseProgress(course.chapters)}%
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-2 space-y-2 rounded-b-lg">
                          {course.chapters.map((chapter) => {
                            const isCompleted = chapterProgress?.[chapter.id];
                            const chapterLink = `/en/student/${wdt_ID}/${course.id}/${chapter.id}`;
                            return (
                              <motion.div
                                key={chapter.id}
                                className={cn(
                                  "flex items-center p-2 rounded-md transition-all duration-200 hover:bg-sky-100/50 dark:hover:bg-sky-800/50 group border border-sky-200 dark:border-sky-700"
                                )}
                                variants={itemVariants}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={cn(
                                        "flex items-center text-xs font-semibold",
                                        isCompleted === true
                                          ? "text-green-500"
                                          : isCompleted === false
                                          ? "text-gray-400"
                                          : "text-yellow-500"
                                      )}
                                    >
                                      {isCompleted === true ? (
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                      ) : isCompleted === false ? (
                                        <PlayCircle className="w-4 h-4 mr-2" />
                                      ) : (
                                        <Lock className="w-4 h-4 mr-2" />
                                      )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="right">
                                    {isCompleted === true
                                      ? "Completed"
                                      : isCompleted === false
                                      ? "In Progress"
                                      : "Locked"}
                                  </TooltipContent>
                                </Tooltip>
                                <button
                                  disabled={!isCompleted}
                                  className={cn(
                                    "text-left text-xs font-medium ml-1 truncate",
                                    isCompleted
                                      ? "text-sky-600 dark:text-sky-400 hover:underline"
                                      : "text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                  )}
                                  onClick={() => {
                                    if (isCompleted) {
                                      router.push(
                                        `${chapterLink}?isClicked=true`
                                      );
                                    }
                                  }}
                                  tabIndex={isCompleted ? 0 : -1}
                                  aria-disabled={!isCompleted}
                                  type="button"
                                  aria-label={`Go to ${chapter.title} ${
                                    isCompleted ? "" : "(Locked)"
                                  }`}
                                >
                                  <span>
                                    Lesson {chapter.position}: {chapter.title}
                                  </span>
                                </button>
                              </motion.div>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}

                  {/* Final Exam Accordion Item */}
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <AccordionItem
                      value="final-exam"
                      className={cn(
                        "border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50/80 dark:bg-blue-900/80 shadow"
                      )}
                    >
                      <AccordionTrigger
                        onClick={handleFinalExamClick}
                        className={cn(
                          "px-3 py-2 text-sm font-semibold text-blue-800 dark:text-blue-200 hover:bg-blue-100/50 dark:hover:bg-blue-800/50 rounded-lg",
                          !allCoursesCompleted &&
                            "cursor-not-allowed opacity-50"
                        )}
                        disabled={!allCoursesCompleted}
                      >
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="truncate">Final Exam</span>
                          {!allCoursesCompleted && (
                            <span className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400">
                              (Complete all to unlock)
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                    </AccordionItem>
                  </motion.div>
                </AnimatePresence>
              </Accordion>
            </TooltipProvider>
          </>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 pt-2 border-t border-sky-200 dark:border-sky-800 mt-2">
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-lg font-medium"
          onClick={() => {
            router.push(`/en/student/${wdt_ID}/profile`);
          }}
          type="button"
          aria-label="Go to Student Dashboard"
        >
          <UserCircle className="w-6 h-6 text-sky-600 dark:text-sky-400" />
        </button>
        <LightDarkToggle className="ml-auto p-1 rounded-full bg-sky-200 dark:bg-sky-800 hover:bg-sky-300 dark:hover:bg-sky-700 transition-colors duration-200 shadow-sm" />
      </footer>
    </nav>
  );
}
