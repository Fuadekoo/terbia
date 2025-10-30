"use client";
import React, { useEffect } from "react";

import { useParams, useRouter } from "next/navigation";
import useAction from "@/hooks/useAction";
import { packageCompleted } from "@/actions/student/progress";
import { getQuestionForActivePackageChapterUpdate } from "@/actions/student/test";
import { noProgress } from "@/actions/student/progress";
import StudentQuestionForm from "@/components/custom/student/StudentQuestionForm";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCoursesPackageId } from "@/actions/admin/package";
import CourseTopOverview from "@/components/courseTopOverview";
import CourseAnnouncements from "@/components/CourseAnnouncements";
import CourseFeedback from "@/components/CourseFeedback";
import CourseMaterials from "@/components/CourseMaterials";
import ChatComponent from "@/components/chatComponent";
import { getPackageData } from "@/actions/student/package";
import MainMenu from "@/components/custom/student/bestMenu";
import TraditionalQA from "@/components/traditionalQA";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { validateStudentAccess } from "@/actions/student/telegram";
import { retrieveRawInitData } from "@telegram-apps/sdk";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};
function Page() {
  const params = useParams();
  const lang = "en";
  const wdt_ID = Number(params?.wdt_ID ?? 0);
  const courseId = String(params?.courseId ?? "");
  const chapterId = String(params?.chapterId ?? "");
  const [authorized, setAuthorized] = React.useState<boolean | null>(null);
  const [chatId, setChatId] = React.useState<string | null>(null);
  const [packageData] = useAction(
    getPackageData,
    [true, (response) => console.log(response)],
    Number(wdt_ID)
  );
  const [data, refetch, isLoading] = useAction(
    getQuestionForActivePackageChapterUpdate,
    [true, (response) => console.log(response)],
    wdt_ID,
    courseId,
    chapterId
  );
  const [progressData] = useAction(
    noProgress,
    [true, (response) => console.log(response)],
    wdt_ID,
    courseId
  );
  const [error, setError] = React.useState<string | null>(null);
  // Gate by Telegram chat id like the student landing page
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = retrieveRawInitData();
      if (raw) {
        const p = new URLSearchParams(raw);
        const json = p.get("chat") || p.get("user");
        if (json) {
          const obj = JSON.parse(json) as { id?: number };
          if (obj?.id) setChatId(String(obj.id));
        }
      }
    } catch {}
    if (!chatId) {
      const w = window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { chat?: { id?: number }; user?: { id?: number } } } } };
      const unsafe = w.Telegram?.WebApp?.initDataUnsafe;
      const id = unsafe?.chat?.id ?? unsafe?.user?.id;
      if (id) setChatId(String(id));
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!chatId || !wdt_ID) return;
      const res = await validateStudentAccess(chatId, wdt_ID);
      setAuthorized(res.authorized);
    })();
  }, [chatId, wdt_ID]);
  const [sidebarActiveTab, setSidebarActiveTab] = React.useState<
    "mainmenu" | "ai"
  >("mainmenu");

  // FIX: Correctly access coursesPackageId from the 'data' object.
  // Assuming 'data' will have a 'packageId' property when successfully fetched.

  // Confetti and toast on package complete

  useEffect(() => {
    async function checkPackage() {
      try {
        const packageIsCompleted = await packageCompleted(wdt_ID); // Renamed variable to avoid conflict
        if (packageIsCompleted) {
          toast.success("🎉 Congratulations! You have completed the package!", {
            duration: 5000,
            style: { background: "#10B981", color: "#fff" },
          });

          // FIX: Correct router.push path and ensure data.packageId is ava
          // Confetti side cannons
          const end = Date.now() + 2 * 1000;
          const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
          const frame = () => {
            if (Date.now() > end) return;
            confetti({
              particleCount: 3,
              angle: 60,
              spread: 55,
              startVelocity: 60,
              origin: { x: 0, y: 0.5 },
              colors,
            });
            confetti({
              particleCount: 3,
              angle: 120,
              spread: 55,
              startVelocity: 60,
              origin: { x: 1, y: 0.5 },
              colors,
            });
            requestAnimationFrame(frame);
          };
          frame();
        }
      } catch (err) {
        setError("Failed to check package completion.");
        console.error(err);
      }
    }

    // Only run checkPackage if data is loaded and not an error/message state
    if (!isLoading && !error && data && !("message" in data)) {
      checkPackage();
    }
  }, [wdt_ID, isLoading, error, data]); // Added coursesPackageId and router to dependencies

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  // Determine default tab based on URL query
  let defaultTab = "mainmenu";
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("isClicked") === "true") {
      // Check if specific tab is requested
      const requestedTab = urlParams.get("tab");
      if (requestedTab === "quiz") {
        defaultTab = "quiz";
      } else if (requestedTab === "mainmenu") {
        defaultTab = "mainmenu";
      } else {
        // Default to quiz for backward compatibility
        defaultTab = "quiz";
      }
    }
  }

  // Restrict access when not authorized
  if (authorized === false) {
    return (
      <motion.div className="flex items-center justify-center min-h-[60vh]" variants={containerVariants} initial="hidden" animate="visible">
        <div className="text-center p-6 border rounded-xl bg-red-50 text-red-700">
          Access denied. Please open from Telegram using your registered account.
        </div>
      </motion.div>
    );
  }

  if (authorized === null) {
    return (
      <motion.div className="flex items-center justify-center min-h-[60vh]" variants={containerVariants} initial="hidden" animate="visible">
        <div className="text-center p-6 border rounded-xl">Verifying access…</div>
      </motion.div>
    );
  }

  // return <div className="">there is no content available</div>;

  // Handle "package not started" state
  if (progressData === true) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] bg-gradient-to-b from-sky-100 to-sky-100 dark:from-sky-900 dark:to-sky-950"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <svg
          className="w-16 h-16 text-blue-500 mb-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z"
          />
        </svg>
        <span className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-2">
          Package Not Started
        </span>
        <span className="text-lg text-gray-600 dark:text-gray-300 mb-6 text-center max-w-md">
          Please start your package using our Telegram bot to access the
          content.
        </span>
        <a
          href="https://t.me/MubareksBot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          aria-label="Open Telegram bot to start package"
        >
          Go to Telegram
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white min-h-screen overflow-hidden"
      style={{
        background: "#f8f9fa",
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* <ProgressPage /> */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Content */}
        <AnimatePresence>
          {isLoading ? (
            //to show loading skeleton
            <motion.div
              className="flex items-center justify-center min-h-[50vh] bg-gradient-to-r from-gray-100 to-gray-100 dark:from-yellow-900 dark:to-yellow-800 rounded-xl"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="animate-pulse w-4/5 h-96 rounded-lg bg-gray-300/50 dark:bg-gray-700/50" />
            </motion.div>
          ) : error ? (
            <motion.div
              className="flex flex-col items-center justify-center min-h-[50vh] bg-red-100 dark:bg-red-900 rounded-xl"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mb-4" />
              <span className="text-xl font-semibold text-red-700 dark:text-red-300 mb-4">
                {error}
              </span>
              <Button
                onClick={() => refetch()}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                aria-label="Retry loading chapter data"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </motion.div>
          ) : data && "message" in data ? (
            <Message message={data.message} wdt_ID={wdt_ID} />
          ) : (
            <>
              {/* Main Layout Container */}
              <div className="flex h-screen bg-white">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden lg:overflow-y-auto">
                  {/* Video Player Section */}
                  <div className="  bg-black flex-shrink-0 flex justify-center ">
                    {data && "chapter" in data && data.chapter?.videoUrl ? (
                     <iframe
                     className="aspect-video lg:w-3xl"
                     src={`https://www.youtube.com/embed/${data.chapter.videoUrl}`}
                     title="Darulkubra video player"
                     frameBorder="0"
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                     referrerPolicy="strict-origin-when-cross-origin"
                     allowFullScreen
                     aria-label="Chapter video player" 
                     style={{
                       // width: "100%",
                       // height: "100%",
                       display: "block",
                     }}
                   />
                    ) : data?.chapter?.customVideo ? (
                      <div className="w-full h-full lg:w-3xl lg:h-auto">
                        <CourseTopOverview
                          {...{
                            video: data?.chapter?.customVideo,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                          No video available
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Tabs Area */}
                  {data &&
                    "chapter" in data &&
                    data.chapter &&
                    Array.isArray(data.chapter.questions) && (
                      <div className="flex-1 flex flex-col bg-white overflow-hidden lg:overflow-visible">
                        <Tabs
                          defaultValue={defaultTab}
                          className="h-full flex flex-col lg:h-auto "
                        >
                           {/* Content Tabs Below Player */}
                            <div className="bg-white flex-shrink-0 border-b border-gray-200">
                                <div className="overflow-x-auto scrollbar-hide scroll-smooth px-4 py-0">
                                 <TabsList className="flex space-x-4 bg-transparent p-0 min-w-max h-12">
                                 <TabsTrigger
                                   value="mainmenu"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:text-gray-900 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-semibold data-[state=inactive]:text-gray-500 lg:hidden transition-all duration-200 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap h-full flex items-center"
                                 >
                                   Main Menu
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="quiz"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:text-gray-900 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-semibold data-[state=inactive]:text-gray-500 transition-all duration-200 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap h-full flex items-center"
                                 >
                                   Quiz
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="qna"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:text-gray-900 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-semibold data-[state=inactive]:text-gray-500 transition-all duration-200 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap h-full flex items-center"
                                 >
                                   Q&A
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="feedback"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:text-gray-900 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:font-semibold data-[state=inactive]:text-gray-500 transition-all duration-200 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap h-full flex items-center"
                                 >
                                   Feedback
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="materials"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:text-gray-900 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-semibold data-[state=inactive]:text-gray-500 transition-all duration-200 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap h-full flex items-center"
                                 >
                                   Materials
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="announcements"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:text-gray-900 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-semibold data-[state=inactive]:text-gray-500 transition-all duration-200 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap h-full flex items-center"
                                 >
                                   Announcements
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="ai"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:text-gray-900 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-semibold data-[state=inactive]:text-gray-500 lg:hidden transition-all duration-200 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap h-full flex items-center"
                                 >
                                   AI Assistance
                                 </TabsTrigger>
                               </TabsList>
                               
                             </div>
                           </div>

                          {/* Content Area */}
                          <div className="flex-1 overflow-y-auto lg:overflow-visible">
                            <div className="px-2 py-2">
                              <div className="lg:overflow-visible">
                                <TabsContent
                                  value="mainmenu"
                                  className="lg:hidden"
                                >
                                  <MainMenu data={packageData} />
                                </TabsContent>
                                <TabsContent
                                  value="quiz"
                                  className=""
                                >
                                  <StudentQuestionForm
                                    chapter={{
                                      questions: data.chapter.questions,
                                    }}
                                    wdt_ID={wdt_ID}
                                    courseId={courseId}
                                    chapterId={data.chapter.id}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="qna"
                                  className="h-full overflow-y-auto"
                                >
                                  <TraditionalQA
                                    packageId={data.packageId}
                                    lang={lang}
                                    studentId={wdt_ID}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="feedback"
                                  className=""
                                >
                                  <CourseFeedback
                                    studentId={wdt_ID}
                                    courseId={data.packageId}
                                    lang={lang}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="materials"
                                  className=""
                                >
                                  <CourseMaterials
                                    courseId={data.packageId}
                                    lang={lang}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="announcements"
                                  className=""
                                >
                                  <CourseAnnouncements
                                    courseId={data.packageId}
                                    lang={lang}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="ai"
                                  className="lg:hidden"
                                >
                                  {/* packageId={data?.packageId || ""}  */}
                                  <ChatComponent packageId={data?.packageId || ""} />
                                </TabsContent>
                              </div>
                            </div>
                          </div>
                        </Tabs>
                      </div>
                    )}
                </div>

                {/* Sticky Right Sidebar - Desktop Only */}
                <div className="hidden lg:block w-80 border-l border-gray-200 bg-white sticky top-0 h-screen overflow-hidden">
                  <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800">
                          Course content
                        </h3>
                      </div>
                    </div>

                    {/* Sidebar Tabs */}
                    <div className="border-b border-gray-200 bg-white flex-shrink-0">
                      <div className="flex">
                        <button
                          onClick={() => setSidebarActiveTab("mainmenu")}
                          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                            sidebarActiveTab === "mainmenu"
                              ? "text-gray-800 bg-white border-b-2 border-blue-500 font-semibold"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          Course content
                        </button>
                        <button
                          onClick={() => setSidebarActiveTab("ai")}
                          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                            sidebarActiveTab === "ai"
                              ? "text-gray-800 bg-white border-b-2 border-blue-500 font-semibold"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          AI Assistant
                        </button>
                      </div>
                    </div>

                    {/* Sidebar Content - Only this scrolls */}
                    <div className="flex-1 overflow-y-auto bg-white">
                      {sidebarActiveTab === "mainmenu" ? (
                        <MainMenu data={packageData} />
                      ) : (
                        // packageId={data?.packageId || ""} 
                        <ChatComponent packageId={data?.packageId || ""} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default Page;

function Message({ message, wdt_ID }: { message: string; wdt_ID: number }) {
  const router = useRouter();
  console.log("showed message in message");
  useEffect(() => {
    (async () => {
      if (await packageCompleted(wdt_ID)) {
        const coursesPackageId = await getCoursesPackageId(wdt_ID);
        setTimeout(() => {
          router.push(`/en/student/${wdt_ID}/finalexam/${coursesPackageId}`);
        }, 5000);
      }
    })();
  }, [router, wdt_ID]);

  return (
    <AnimatePresence>
      <motion.div
        className="flex flex-col items-center justify-center min-h-[50vh] bg-gradient-to-r from-green-100 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <svg
              className="w-12 h-12 text-green-600 dark:text-green-400 mb-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </TooltipTrigger>
          <TooltipContent>{message}</TooltipContent>
        </Tooltip>
        <span className="text-xl font-bold text-green-700 dark:text-green-300 text-center">
          {message}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
