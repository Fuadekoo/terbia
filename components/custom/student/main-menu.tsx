"use client";

import React from "react";
import MenuTitle from "./menu-title";
import { LightDarkToggle } from "@/components/ui/light-dark-toggle";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  LayoutDashboard,
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
        "flex flex-col gap-3 overflow-y-hidden bg-sidebar px-3 py-4 text-sidebar-foreground transition-all duration-300",
        className
      )}
      aria-label="Main navigation"
    >
      <header className="border-b border-sidebar-border pb-3">
        <MenuTitle
          title={data?.name || "Student"}
          subtitle={data?.subject || ""}
          showBadge={!!data?.activePackage}
          badgeText={data?.status || ""}
          badgeVariant="premium"
          className="text-base"
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loading />
          </div>
        ) : !data || !data.activePackage ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No active package found.
          </div>
        ) : (
          <>
            <motion.h3
              className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              {data.activePackage.name}
            </motion.h3>
            <TooltipProvider>
              <Accordion type="single" collapsible className="w-full space-y-2">
                <AnimatePresence>
                  {data.activePackage.courses.map((course) => {
                    const progress = getCourseProgress(course.chapters);
                    return (
                      <motion.div
                        key={course.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                      >
                        <AccordionItem
                          value={`course-${course.id}`}
                          className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
                        >
                          <AccordionTrigger className="px-3 py-2.5 text-sm font-semibold hover:bg-accent/50 hover:no-underline">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="shrink-0 font-bold text-primary">
                                {course.order}.
                              </span>
                              <span className="truncate">{course.title}</span>
                              <span className="ml-auto shrink-0 pl-2 text-xs font-medium tabular-nums text-muted-foreground">
                                {progress}%
                              </span>
                            </div>
                          </AccordionTrigger>

                          {/* Progress bar sits flush under the trigger */}
                          <div
                            className="h-1 w-full bg-muted"
                            role="progressbar"
                            aria-valuenow={progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${course.title} progress`}
                          >
                            <div
                              className="h-full rounded-r-full bg-primary transition-[width] duration-500 ease-out-soft"
                              style={{ width: `${progress}%` }}
                            />
                          </div>

                          <AccordionContent className="space-y-1.5 p-2">
                            {course.chapters.map((chapter) => {
                              const isCompleted = chapterProgress?.[chapter.id];
                              const chapterLink = `/en/student/${wdt_ID}/${course.id}/${chapter.id}`;
                              const statusLabel =
                                isCompleted === true
                                  ? "Completed"
                                  : isCompleted === false
                                  ? "In Progress"
                                  : "Locked";
                              return (
                                <motion.button
                                  key={chapter.id}
                                  type="button"
                                  disabled={!isCompleted}
                                  variants={itemVariants}
                                  onClick={() => {
                                    if (isCompleted) {
                                      router.push(
                                        `${chapterLink}?isClicked=true`
                                      );
                                    }
                                  }}
                                  aria-disabled={!isCompleted}
                                  aria-label={`Lesson ${chapter.position}: ${chapter.title} — ${statusLabel}`}
                                  className={cn(
                                    "focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-200",
                                    isCompleted
                                      ? "hover:bg-accent"
                                      : "cursor-not-allowed opacity-60"
                                  )}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        className={cn(
                                          "flex shrink-0 items-center",
                                          isCompleted === true
                                            ? "text-success-tint-fg"
                                            : isCompleted === false
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                        )}
                                      >
                                        {isCompleted === true ? (
                                          <CheckCircle className="size-4" />
                                        ) : isCompleted === false ? (
                                          <PlayCircle className="size-4" />
                                        ) : (
                                          <Lock className="size-4" />
                                        )}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      {statusLabel}
                                    </TooltipContent>
                                  </Tooltip>
                                  <span className="truncate text-xs font-medium">
                                    Lesson {chapter.position}: {chapter.title}
                                  </span>
                                </motion.button>
                              );
                            })}
                          </AccordionContent>
                        </AccordionItem>
                      </motion.div>
                    );
                  })}

                  {/* Final exam */}
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <button
                      type="button"
                      onClick={handleFinalExamClick}
                      disabled={!canOpenFinalExam}
                      className={cn(
                        "focus-ring flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ease-out-soft",
                        canOpenFinalExam
                          ? "border-primary/30 bg-primary/8 text-primary hover:bg-primary/14 hover:shadow-xs"
                          : "cursor-not-allowed border-border bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <Trophy className="size-4.5 shrink-0" />
                      <span className="truncate">Final Exam</span>
                      {!canOpenFinalExam && (
                        <span className="ml-auto shrink-0 pl-2 text-[0.6875rem] font-medium">
                          Complete all to unlock
                        </span>
                      )}
                    </button>
                  </motion.div>
                </AnimatePresence>
              </Accordion>
            </TooltipProvider>
          </>
        )}
      </div>

      <footer className="mt-1 flex items-center justify-between gap-1 border-t border-sidebar-border pt-3">
        <button
          className="focus-ring flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-accent hover:text-sidebar-foreground"
          onClick={() => router.push(`/en/student/${wdt_ID}/dashboard`)}
          type="button"
          aria-label="Go to dashboard"
        >
          <LayoutDashboard className="size-5" />
          <span>Dashboard</span>
        </button>
        <button
          className="focus-ring flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-accent hover:text-sidebar-foreground"
          onClick={() => router.push(`/en/student/${wdt_ID}/profile`)}
          type="button"
          aria-label="Go to student profile"
        >
          <UserCircle className="size-5" />
          <span>Profile</span>
        </button>
        <LightDarkToggle className="ml-auto rounded-full p-1.5 transition-colors duration-200 hover:bg-accent" />
      </footer>
    </nav>
  );
}
