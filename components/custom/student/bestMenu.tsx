"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  PlayCircle,
  Lock,
  Trophy,
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
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";

// Removed Loading import - using custom skeleton instead

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

export default function MainMenu({ data, className, themeColors }: MainMenuProps) {
  // Use Telegram theme colors or defaults
  const bgColor = themeColors?.bg || "#ffffff";
  const textColor = themeColors?.text || "#000000";
  const hintColor = themeColors?.hint || "#6b7280";
  const linkColor = themeColors?.link || "#0ea5e9";
  const secondaryBg = themeColors?.secondaryBg || "#f3f4f6";

  const params = useParams();
  const wdt_ID = Number(params?.wdt_ID ?? 0);

  const [chapterProgress, setChapterProgress] = React.useState<
    Record<string, boolean | null>
  >({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [allCoursesCompleted, setAllCoursesCompleted] = React.useState(false);
  const [openSections, setOpenSections] = React.useState<string[]>([]);

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
        const progressMap = Object.fromEntries(progressEntries);
        setChapterProgress(progressMap);
        
        const areAllChaptersTrulyCompleted =
          await isCompletedAllChaptersInthePackage(
            data.activePackage.id,
            data.wdt_ID
          );
        setAllCoursesCompleted(areAllChaptersTrulyCompleted);
        
        // Auto-open first section with in-progress chapters
        const firstInProgressCourse = data.activePackage.courses.find(course => 
          course.chapters.some(chapter => progressMap[chapter.id] === false)
        );
        if (firstInProgressCourse) {
          setOpenSections([firstInProgressCourse.id]);
        } else {
          // If no in-progress chapters, open the first section
          if (data.activePackage.courses.length > 0) {
            setOpenSections([data.activePackage.courses[0].id]);
          }
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllProgress();
  }, [data, wdt_ID]);



  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const handleLockedLessonClick = (chapterTitle: string) => {
    toast.warning("🔒 Lesson Locked", {
      description: `You need to complete the quiz for "${chapterTitle}" first to unlock this lesson.`,
      duration: 4000,
      style: {
        background: "#FEF3C7",
        color: "#92400E",
        border: "1px solid #F59E0B",
      },
    });
  };


  return (
    <div
      className={cn(
        "w-full overflow-y-auto",
        className
      )}
      style={{ background: bgColor }}
    >
        {isLoading ? (
        <div className="w-full p-4 space-y-4">
          {/* Course Content Skeleton */}
          <div className="space-y-3">
            {/* Section 1 Skeleton */}
            <div className="border-b" style={{ borderColor: `${hintColor}30` }}>
              <div className="py-2 pl-3 pr-3" style={{ background: secondaryBg }}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 rounded w-3/4 mb-2 animate-pulse" style={{ background: `${hintColor}40` }}></div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 rounded w-16 animate-pulse" style={{ background: `${hintColor}30` }}></div>
                      <div className="h-3 rounded w-1 animate-pulse" style={{ background: `${hintColor}30` }}></div>
                      <div className="h-3 rounded w-20 animate-pulse" style={{ background: `${hintColor}30` }}></div>
                    </div>
                  </div>
                  <div className="h-4 w-4 rounded animate-pulse" style={{ background: `${hintColor}40` }}></div>
                </div>
              </div>
              
              {/* Lessons Skeleton */}
              <div className="space-y-0">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="pl-4 pr-3 py-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-4 bg-gray-300 rounded w-2/3 animate-pulse"></div>
                          <div className="h-3 w-3 bg-gray-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
                          <div className="h-3 bg-gray-300 rounded w-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2 Skeleton */}
            <div className="border-b border-gray-200">
              <div className="bg-gray-50 py-2 pl-3 pr-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-300 rounded w-2/3 mb-2 animate-pulse"></div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 bg-gray-300 rounded w-14 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-18 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-20 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-4 w-4 bg-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
              
              {/* Lessons Skeleton */}
              <div className="space-y-0">
                {[1, 2].map((index) => (
                  <div key={index} className="pl-4 pr-3 py-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                          <div className="h-3 w-3 bg-gray-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
                          <div className="h-3 bg-gray-300 rounded w-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-300 rounded w-14 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3 Skeleton */}
            <div className="border-b border-gray-200">
              <div className="bg-gray-50 py-2 pl-3 pr-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-300 rounded w-4/5 mb-2 animate-pulse"></div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-22 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-4 w-4 bg-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
              
              {/* Lessons Skeleton */}
              <div className="space-y-0">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="pl-4 pr-3 py-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-4 bg-gray-300 rounded w-5/6 animate-pulse"></div>
                          <div className="h-3 w-3 bg-gray-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
                          <div className="h-3 bg-gray-300 rounded w-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-300 rounded w-18 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Final Exam Skeleton */}
          <div className="mt-4 border-b border-gray-200">
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-lg animate-pulse"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-300 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
                    <div className="h-3 bg-gray-300 rounded w-1 animate-pulse"></div>
                    <div className="h-3 bg-gray-300 rounded w-40 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        ) : !data || !data.activePackage ? (
        <div 
          className="text-center py-8 text-sm"
          style={{ color: hintColor }}
        >
            No active package found.
          </div>
        ) : (
        <div className="w-full">
          {/* Course Content with Accordion */}
          <Accordion 
            type="multiple" 
            value={openSections} 
            onValueChange={setOpenSections}
            className="w-full"
          >
            {data.activePackage.courses.map((course, courseIndex) => {
              const hasInProgressChapters = course.chapters.some(
                chapter => chapterProgress?.[chapter.id] === false
              );
              
              // Calculate progress percentage for this course
              const totalChapters = course.chapters.length;
              const completedChapters = course.chapters.filter(
                chapter => chapterProgress?.[chapter.id] === true
              ).length;
              const progressPercentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
              
              return (
                <AccordionItem 
                  key={course.id} 
                  value={course.id} 
                  className="border-b"
                  style={{ borderColor: `${hintColor}30` }}
                >
                  <AccordionTrigger 
                    className="hover:no-underline py-2 pl-3 pr-3 transition-colors duration-200"
                    style={{ background: secondaryBg }}
                  >
                    <div className="flex items-center gap-3 text-left">
                      {/* Course Info */}
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="text-sm font-semibold truncate"
                          style={{ color: textColor }}
                        >
                          Section {courseIndex + 1} - {course.title}
                        </h3>
                        <div 
                          className="flex items-center gap-2 text-xs mt-1"
                          style={{ color: hintColor }}
                        >
                          <span>{course.chapters.length} lessons</span>
                          <span>•</span>
                          <span className="font-medium" style={{ color: textColor }}>
                            {progressPercentage}% complete
                          </span>
                          {hasInProgressChapters && (
                            <>
                              <span>•</span>
                              <span className="font-medium" style={{ color: linkColor }}>
                                In Progress
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                          </div>
                        </AccordionTrigger>
                  
                  <AccordionContent className="pb-1">
                    <div className="space-y-0">
                      {course.chapters.map((chapter, chapterIndex) => {
                            const isCompleted = chapterProgress?.[chapter.id];
                            const chapterLink = `/en/student/${wdt_ID}/${course.id}/${chapter.id}`;
                        const isActive = false; // You can determine this based on current route
                        
                            return (
                              <motion.div
                                key={chapter.id}
                            variants={itemVariants}
                            className="w-full"
                          >
                            <Link
                              href={
                                isCompleted === false
                                  ? `${chapterLink}?isClicked=true&tab=quiz`
                                  : isCompleted === true
                                  ? `${chapterLink}?isClicked=true&tab=mainmenu`
                                  : `${chapterLink}?isClicked=true&tab=quiz`
                              }
                              onClick={() => {
                                if (isCompleted === null) {
                                  handleLockedLessonClick(chapter.title);
                                }
                              }}
                              className="w-full pl-4 pr-3 py-2 text-left transition-colors duration-200 block"
                              style={{
                                background: isCompleted === false ? `${secondaryBg}dd` : bgColor,
                                opacity: isCompleted === null ? 0.5 : 1,
                              }}
                            >
                              <div className="flex items-start gap-3">
                                {/* Lesson Number */}
                                <div 
                                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                  style={{ background: `${hintColor}30` }}
                                >
                                  <span 
                                    className="text-xs font-medium"
                                    style={{ color: textColor }}
                                  >
                                    {chapterIndex + 1}
                                  </span>
                                </div>

                                {/* Lesson Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 
                                      className="text-sm font-medium truncate"
                                      style={{ 
                                        color: textColor,
                                        fontWeight: isActive ? 600 : 500
                                      }}
                                    >
                                      {chapter.title}
                                    </h4>
                                    {isCompleted === true && (
                                      <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: "#22c55e" }} />
                                    )}
                                    {isCompleted === false && (
                                      <PlayCircle className="w-3 h-3 flex-shrink-0" style={{ color: linkColor }} />
                                    )}
                                    {isCompleted === null && (
                                      <Lock className="w-3 h-3 flex-shrink-0" style={{ color: hintColor }} />
                                    )}
                                  </div>
                                  
                                  <div 
                                    className="flex items-center gap-2 text-xs"
                                    style={{ color: hintColor }}
                                  >
                                    <span>Video</span>
                                    <span>•</span>
                                    <span>
                                      {isCompleted === true ? "Completed" : 
                                       isCompleted === false ? "In Progress" : 
                                       "Locked"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                              </motion.div>
                            );
                          })}
                    </div>
                        </AccordionContent>
                      </AccordionItem>
              );
            })}
          </Accordion>

            {/* Final Exam Section */}
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
              className="w-full mt-4"
                  >
              <div className="border-b" style={{ borderColor: `${hintColor}30` }}>
                {!allCoursesCompleted ? (
                  <div
                      className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center gap-3 opacity-50 cursor-not-allowed"
                  >
                    {/* Final Exam Icon */}
                    <div 
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "#fef3c7" }}
                    >
                      <Trophy className="w-4 h-4" style={{ color: "#ca8a04" }} />
                    </div>
                    
                    {/* Final Exam Info */}
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-sm font-semibold"
                        style={{ color: textColor }}
                      >
                        Final Assessment
                      </h3>
                      <div 
                        className="flex items-center gap-2 text-xs mt-1"
                        style={{ color: hintColor }}
                      >
                        <span>Exam</span>
                        <span>•</span>
                        <span className="font-medium" style={{ color: "#ea580c" }}>
                          Complete all lessons to unlock
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/en/student/${data?.wdt_ID}/finalexam/${data?.activePackage?.id}`}
                    className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center gap-3"
                    style={{ background: bgColor }}
                  >
                    {/* Final Exam Icon */}
                    <div 
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "#fef3c7" }}
                    >
                      <Trophy className="w-4 h-4" style={{ color: "#ca8a04" }} />
                    </div>
                    
                    {/* Final Exam Info */}
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-sm font-semibold"
                        style={{ color: textColor }}
                      >
                        Final Assessment
                      </h3>
                      <div 
                        className="flex items-center gap-2 text-xs mt-1"
                        style={{ color: hintColor }}
                      >
                        <span>Exam</span>
                      </div>
                    </div>
                  </Link>
                          )}
                        </div>
                  </motion.div>
        </div>
        )}
      </div>
  );
}
