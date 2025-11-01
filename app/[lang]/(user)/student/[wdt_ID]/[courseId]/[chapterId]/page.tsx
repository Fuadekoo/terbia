"use client";
import React, { useEffect, useState, useMemo } from "react";

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
import ProfileHeader from "@/components/custom/student/ProfileHeader";

// Telegram Theme Types
interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramThemeChangedEvent {
  theme_params?: TelegramThemeParams;
}

interface TelegramWebApp {
  initDataUnsafe?: { chat?: { id?: number }; user?: { id?: number } };
  themeParams?: TelegramThemeParams;
  ready?: () => void;
  expand?: () => void;
  requestTheme?: () => void;
  setHeaderColor?: (color: string | { color_key: string }) => void;
  setBackgroundColor?: (color: string | { color_key: string }) => void;
  onEvent?: (event: string, handler: (event?: TelegramThemeChangedEvent) => void) => void;
  offEvent?: (event: string, handler: (event?: TelegramThemeChangedEvent) => void) => void;
}

interface TelegramWindow {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

// Professional Telegram theme hook using official Telegram Web App script
function useTelegramTheme() {
  const [theme, setTheme] = useState<TelegramThemeParams>({});

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let retryTimeout: NodeJS.Timeout | undefined;
    const maxRetries = 50;
    let retryCount = 0;

    const initializeTelegramWebApp = () => {
      if (typeof window === 'undefined') return;

      const w = window as unknown as TelegramWindow;
      const webApp = w.Telegram?.WebApp;

      if (!webApp) {
        if (retryCount < maxRetries) {
          retryCount++;
          retryTimeout = setTimeout(initializeTelegramWebApp, 100);
        }
        return;
      }

      if (webApp.ready) webApp.ready();
      if (webApp.expand) webApp.expand();

      const updateTheme = (themeParams?: TelegramThemeParams) => {
        const currentTheme = themeParams || webApp.themeParams;
        
        if (currentTheme) {
          setTheme(currentTheme);
          
          if (webApp.setHeaderColor) {
            webApp.setHeaderColor(currentTheme.button_color || currentTheme.bg_color || '#ffffff');
          }
          
          if (webApp.setBackgroundColor) {
            webApp.setBackgroundColor(currentTheme.bg_color || '#ffffff');
          }
        }
      };

      if (webApp.themeParams) {
        updateTheme(webApp.themeParams);
      }

      if (webApp.requestTheme) {
        webApp.requestTheme();
      }

      const handleThemeChanged = (event?: TelegramThemeChangedEvent) => {
        if (event?.theme_params) {
          updateTheme(event.theme_params);
        } else if (webApp.themeParams) {
          updateTheme();
        }
      };

      if (webApp.onEvent) {
        webApp.onEvent('theme_changed', handleThemeChanged);
        webApp.onEvent('themeChanged', handleThemeChanged);
      }

      cleanup = () => {
        if (webApp.offEvent) {
          webApp.offEvent('theme_changed', handleThemeChanged);
          webApp.offEvent('themeChanged', handleThemeChanged);
        }
      };
    };

    initializeTelegramWebApp();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (cleanup) cleanup();
    };
  }, []);

  return theme;
}

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
  
  // Use Telegram theme hook
  const theme = useTelegramTheme();

  // Professional theme utilities with memoization
  const themeColors = useMemo(() => {
    let isLightTheme = true;
    if (theme.bg_color) {
      try {
        const bgHex = theme.bg_color.replace('#', '');
        const bgValue = parseInt(bgHex, 16);
        const r = (bgValue >> 16) & 0xff;
        const g = (bgValue >> 8) & 0xff;
        const b = bgValue & 0xff;
        const avg = (r + g + b) / 3;
        isLightTheme = avg > 128 || theme.bg_color.toLowerCase() === '#ffffff';
      } catch {
        isLightTheme = true;
      }
    }
    
    return {
      bg: theme.bg_color || '#ffffff',
      text: theme.text_color || (isLightTheme ? '#000000' : '#ffffff'),
      hint: theme.hint_color || (isLightTheme ? '#999999' : '#aaaaaa'),
      link: theme.link_color || '#0ea5e9',
      button: theme.button_color || '#0ea5e9',
      buttonText: theme.button_text_color || '#ffffff',
      secondaryBg: theme.secondary_bg_color || (isLightTheme ? '#f0f0f0' : '#1a1a1a'),
    };
  }, [theme]);
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
    
    let extractedId: string | null = null;
    
    try {
      const raw = retrieveRawInitData();
      if (raw) {
        const p = new URLSearchParams(raw);
        const json = p.get("chat") || p.get("user");
        if (json) {
          const obj = JSON.parse(json) as { id?: number };
          if (obj?.id) extractedId = String(obj.id);
        }
      }
    } catch {}
    
    if (!extractedId) {
      const w = window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { chat?: { id?: number }; user?: { id?: number } } } } };
      const unsafe = w.Telegram?.WebApp?.initDataUnsafe;
      const id = unsafe?.chat?.id ?? unsafe?.user?.id;
      if (id) extractedId = String(id);
    }
    
    if (extractedId && !chatId) {
      setChatId(extractedId);
    }
  }, [chatId]);

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
      <motion.div 
        className="flex items-center justify-center min-h-[60vh] pt-[5px]" 
        style={{ background: themeColors.bg }}
        variants={containerVariants} 
        initial="hidden" 
        animate="visible"
      >
        <div 
          className="text-center p-6 border rounded-xl"
          style={{ 
            background: themeColors.secondaryBg,
            color: themeColors.text,
            borderColor: themeColors.hint 
          }}
        >
          Access denied. Please open from Telegram using your registered account.
        </div>
      </motion.div>
    );
  }

  if (authorized === null) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-[60vh] pt-[5px]" 
        style={{ background: themeColors.bg, color: themeColors.text }}
        variants={containerVariants} 
        initial="hidden" 
        animate="visible"
      >
        <div 
          className="text-center p-6 border rounded-xl"
          style={{ 
            borderColor: themeColors.hint,
            background: themeColors.secondaryBg,
            color: themeColors.text 
          }}
        >
          Verifying access…
        </div>
      </motion.div>
    );
  }

  // return <div className="">there is no content available</div>;

  // Handle "package not started" state
  if (progressData === true) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] pt-[5px]"
        style={{ background: themeColors.bg }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <svg
          className="w-16 h-16 mb-4"
          style={{ color: themeColors.link }}
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
        <span 
          className="text-2xl font-bold mb-2"
          style={{ color: themeColors.text }}
        >
          Package Not Started
        </span>
        <span 
          className="text-lg mb-6 text-center max-w-md"
          style={{ color: themeColors.hint }}
        >
          Please start your package using our Telegram bot to access the
          content.
        </span>
        <a
          href="https://t.me/MubareksBot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 rounded-lg shadow-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ 
            background: themeColors.button,
            color: themeColors.buttonText 
          }}
          aria-label="Open Telegram bot to start package"
        >
          Go to Telegram
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white min-h-screen overflow-hidden pt-[5px]"
      style={{
        background: themeColors.bg,
        color: themeColors.text,
        // CSS custom properties for dynamic theming
        ['--theme-bg' as string]: themeColors.bg,
        ['--theme-text' as string]: themeColors.text,
        ['--theme-hint' as string]: themeColors.hint,
        ['--theme-link' as string]: themeColors.link,
        ['--theme-button' as string]: themeColors.button,
        ['--theme-button-text' as string]: themeColors.buttonText,
        ['--theme-secondary-bg' as string]: themeColors.secondaryBg,
      } as React.CSSProperties}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Injected styles for tabs active state and component theming */}
      <style jsx global>{`
        /* Hide header in fullscreen mode */
        :fullscreen .profile-header,
        :-webkit-full-screen .profile-header,
        :-moz-full-screen .profile-header,
        :-ms-fullscreen .profile-header {
          display: none !important;
        }
        
        /* Tab active states */
        [data-state="active"] {
          color: ${themeColors.text} !important;
          background: ${themeColors.secondaryBg} !important;
          border-bottom: 3px solid ${themeColors.link} !important;
          font-weight: 600 !important;
        }
        
        /* Tab hover states */
        [role="tab"]:hover:not([data-state="active"]) {
          background: ${themeColors.secondaryBg}40 !important;
        }
        
        /* Button theming */
        button:not([style*="background"]):not(.no-theme) {
          background: ${themeColors.button} !important;
          color: ${themeColors.buttonText} !important;
        }
        
        /* Card and component borders */
        .border:not([style*="border-color"]) {
          border-color: ${themeColors.secondaryBg} !important;
        }
        
        /* Input and form elements */
        input, textarea, select {
          background: ${themeColors.secondaryBg} !important;
          color: ${themeColors.text} !important;
          border-color: ${themeColors.hint} !important;
        }
        
        input::placeholder, textarea::placeholder {
          color: ${themeColors.hint} !important;
        }
        
        /* Hover states */
        button:hover:not(:disabled) {
          opacity: 0.9;
        }
        
        /* Links */
        a:not([style*="color"]) {
          color: ${themeColors.link} !important;
        }
        
        /* Scrollbar theming */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${themeColors.secondaryBg};
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${themeColors.hint};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${themeColors.link};
        }
      `}</style>
      
      {/* <ProgressPage /> */}
      <div 
        className="flex flex-col h-screen overflow-hidden"
        style={{
          background: themeColors.bg,
          color: themeColors.text,
        }}
      >
        {/* Content */}
        <AnimatePresence>
          {isLoading ? (
            //to show loading skeleton
            <motion.div
              className="flex items-center justify-center min-h-[50vh] rounded-xl"
              style={{ background: themeColors.bg }}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <div 
                className="animate-pulse w-4/5 h-96 rounded-lg"
                style={{ background: themeColors.secondaryBg }}
              />
            </motion.div>
          ) : error ? (
            <motion.div
              className="flex flex-col items-center justify-center min-h-[50vh] rounded-xl"
              style={{ background: themeColors.bg }}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <AlertCircle 
                className="w-12 h-12 mb-4" 
                style={{ color: themeColors.link }}
              />
              <span 
                className="text-xl font-semibold mb-4"
                style={{ color: themeColors.text }}
              >
                {error}
              </span>
              <Button
                onClick={() => refetch()}
                className="flex items-center gap-2"
                style={{ 
                  background: themeColors.button,
                  color: themeColors.buttonText 
                }}
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
              <div 
                className="flex h-screen flex-col"
                style={{ background: themeColors.bg }}
              >
                {/* Profile Header */}
                <ProfileHeader
                  name={packageData?.name || "Student"}
                  role="Student"
                  hasNotification={true}
                  themeColors={themeColors}
                />

                <div className="flex h-full overflow-hidden">
                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col overflow-hidden lg:overflow-y-auto">
                    {/* Video Player Section */}
                    <div 
                      className="flex-shrink-0 flex justify-center"
                      style={{ background: '#000000' }}
                    >
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
                          video={data?.chapter?.customVideo}
                          themeColors={themeColors}
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: '#111827' }}
                      >
                        <span 
                          className="text-xl font-semibold"
                          style={{ color: themeColors.hint }}
                        >
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
                      <div 
                        className="flex-1 flex flex-col overflow-hidden lg:overflow-visible"
                        style={{ background: themeColors.bg }}
                      >
                        <Tabs
                          defaultValue={defaultTab}
                          className="h-full flex flex-col lg:h-auto "
                        >
                           {/* Content Tabs Below Player */}
                            <div 
                              className="flex-shrink-0 border-b"
                              style={{ 
                                background: themeColors.bg,
                                borderColor: themeColors.secondaryBg 
                              }}
                            >
                                <div className="overflow-x-auto scrollbar-hide scroll-smooth px-4 py-0">
                                 <TabsList 
                                   className="flex space-x-4 bg-transparent p-0 min-w-max h-12"
                                   style={{ background: 'transparent' }}
                                 >
                                 <TabsTrigger
                                   value="mainmenu"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:font-semibold lg:hidden transition-all duration-200 whitespace-nowrap h-full flex items-center"
                                   style={{
                                     color: themeColors.hint,
                                     background: 'transparent',
                                   }}
                                 >
                                   Main Menu
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="quiz"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:font-semibold transition-all duration-200 whitespace-nowrap h-full flex items-center"
                                   style={{
                                     color: themeColors.hint,
                                     background: 'transparent',
                                   }}
                                 >
                                   Quiz
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="qna"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:font-semibold transition-all duration-200 whitespace-nowrap h-full flex items-center"
                                   style={{
                                     color: themeColors.hint,
                                     background: 'transparent',
                                   }}
                                 >
                                   Q&A
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="feedback"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:font-semibold transition-all duration-200 whitespace-nowrap h-full flex items-center"
                                   style={{
                                     color: themeColors.hint,
                                     background: 'transparent',
                                   }}
                                 >
                                   Feedback
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="materials"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:font-semibold transition-all duration-200 whitespace-nowrap h-full flex items-center"
                                   style={{
                                     color: themeColors.hint,
                                     background: 'transparent',
                                   }}
                                 >
                                   Materials
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="announcements"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:font-semibold transition-all duration-200 whitespace-nowrap h-full flex items-center"
                                   style={{
                                     color: themeColors.hint,
                                     background: 'transparent',
                                   }}
                                 >
                                   Announcements
                                 </TabsTrigger>
                                 <TabsTrigger
                                   value="ai"
                                   className="text-sm font-medium px-4 py-3 bg-transparent border-none rounded-none data-[state=active]:font-semibold lg:hidden transition-all duration-200 whitespace-nowrap h-full flex items-center"
                                   style={{
                                     color: themeColors.hint,
                                     background: 'transparent',
                                   }}
                                 >
                                   AI Assistance
                                 </TabsTrigger>
                               </TabsList>
                               
                             </div>
                           </div>

                          {/* Content Area */}
                          <div 
                            className="flex-1 overflow-y-auto lg:overflow-visible"
                            style={{ background: themeColors.bg }}
                          >
                            <div 
                              className="px-2 py-2"
                              style={{ background: themeColors.bg }}
                            >
                              <div className="lg:overflow-visible">
                                <TabsContent
                                  value="mainmenu"
                                  className="lg:hidden"
                                  style={{ background: themeColors.bg, color: themeColors.text }}
                                >
                                  <MainMenu data={packageData} themeColors={themeColors} />
                                </TabsContent>
                                <TabsContent
                                  value="quiz"
                                  className=""
                                  style={{ background: themeColors.bg, color: themeColors.text }}
                                >
                                  <StudentQuestionForm
                                    chapter={{
                                      questions: data.chapter.questions,
                                    }}
                                    wdt_ID={wdt_ID}
                                    courseId={courseId}
                                    chapterId={data.chapter.id}
                                    themeColors={themeColors}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="qna"
                                  className="h-full overflow-y-auto"
                                  style={{ background: themeColors.bg, color: themeColors.text }}
                                >
                                  <TraditionalQA
                                    packageId={data.packageId}
                                    lang={lang}
                                    studentId={wdt_ID}
                                    themeColors={themeColors}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="feedback"
                                  className=""
                                  style={{ background: themeColors.bg, color: themeColors.text }}
                                >
                                  <CourseFeedback
                                    studentId={wdt_ID}
                                    courseId={data.packageId}
                                    lang={lang}
                                    themeColors={themeColors}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="materials"
                                  className=""
                                  style={{ background: themeColors.bg, color: themeColors.text }}
                                >
                                  <CourseMaterials
                                    courseId={data.packageId}
                                    lang={lang}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="announcements"
                                  className=""
                                  style={{ background: themeColors.bg, color: themeColors.text }}
                                >
                                  <CourseAnnouncements
                                    courseId={data.packageId}
                                    lang={lang}
                                  />
                                </TabsContent>
                                <TabsContent
                                  value="ai"
                                  className="lg:hidden"
                                  style={{ background: themeColors.bg, color: themeColors.text }}
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
                  <div 
                    className="hidden lg:block w-80 border-l sticky top-0 h-screen overflow-hidden"
                    style={{ 
                      background: themeColors.bg,
                      borderColor: themeColors.secondaryBg 
                    }}
                  >
                    <div className="h-full flex flex-col">
                      {/* Sidebar Header */}
                      <div 
                        className="px-4 py-3 border-b flex-shrink-0"
                        style={{ 
                          background: themeColors.secondaryBg,
                          borderColor: themeColors.secondaryBg 
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <h3 
                            className="text-sm font-semibold"
                            style={{ color: themeColors.text }}
                          >
                            Course content
                          </h3>
                        </div>
                      </div>

                    {/* Sidebar Tabs */}
                    <div 
                      className="border-b flex-shrink-0"
                      style={{ 
                        background: themeColors.bg,
                        borderColor: themeColors.secondaryBg 
                      }}
                    >
                      <div className="flex">
                        <button
                          onClick={() => setSidebarActiveTab("mainmenu")}
                          className="flex-1 px-4 py-2 text-sm font-medium transition-all duration-200 no-theme"
                          style={{
                            color: sidebarActiveTab === "mainmenu" ? themeColors.text : themeColors.hint,
                            background: sidebarActiveTab === "mainmenu" ? `${themeColors.secondaryBg}` : themeColors.bg,
                            borderBottom: sidebarActiveTab === "mainmenu" ? `2px solid ${themeColors.link}` : 'none',
                            fontWeight: sidebarActiveTab === "mainmenu" ? '600' : '500',
                          }}
                        >
                          Course content
                        </button>
                        <button
                          onClick={() => setSidebarActiveTab("ai")}
                          className="flex-1 px-4 py-2 text-sm font-medium transition-all duration-200 no-theme"
                          style={{
                            color: sidebarActiveTab === "ai" ? themeColors.text : themeColors.hint,
                            background: sidebarActiveTab === "ai" ? `${themeColors.secondaryBg}` : themeColors.bg,
                            borderBottom: sidebarActiveTab === "ai" ? `2px solid ${themeColors.link}` : 'none',
                            fontWeight: sidebarActiveTab === "ai" ? '600' : '500',
                          }}
                        >
                          AI Assistant
                        </button>
                      </div>
                    </div>

                    {/* Sidebar Content - Only this scrolls */}
                    <div 
                      className="flex-1 overflow-y-auto"
                      style={{ background: themeColors.bg }}
                    >
                      {sidebarActiveTab === "mainmenu" ? (
                        <MainMenu data={packageData} themeColors={themeColors} />
                      ) : (
                        // packageId={data?.packageId || ""} 
                        <ChatComponent packageId={data?.packageId || ""} />
                      )}
                    </div>
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
  const theme = useTelegramTheme();
  
  // Professional theme utilities with memoization
  const themeColors = useMemo(() => {
    let isLightTheme = true;
    if (theme.bg_color) {
      try {
        const bgHex = theme.bg_color.replace('#', '');
        const bgValue = parseInt(bgHex, 16);
        const r = (bgValue >> 16) & 0xff;
        const g = (bgValue >> 8) & 0xff;
        const b = bgValue & 0xff;
        const avg = (r + g + b) / 3;
        isLightTheme = avg > 128 || theme.bg_color.toLowerCase() === '#ffffff';
      } catch {
        isLightTheme = true;
      }
    }
    
    return {
      bg: theme.bg_color || '#ffffff',
      text: theme.text_color || (isLightTheme ? '#000000' : '#ffffff'),
      hint: theme.hint_color || (isLightTheme ? '#999999' : '#aaaaaa'),
      link: theme.link_color || '#0ea5e9',
      button: theme.button_color || '#0ea5e9',
      buttonText: theme.button_text_color || '#ffffff',
      secondaryBg: theme.secondary_bg_color || (isLightTheme ? '#f0f0f0' : '#1a1a1a'),
    };
  }, [theme]);
  
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
        className="flex flex-col items-center justify-center min-h-[50vh] rounded-xl"
        style={{
          background: themeColors.secondaryBg,
        }}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <svg
              className="w-12 h-12 mb-4"
              style={{ color: themeColors.link }}
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
          <TooltipContent 
            style={{ 
              background: themeColors.secondaryBg, 
              color: themeColors.text,
              borderColor: themeColors.hint
            }}
          >
            {message}
          </TooltipContent>
        </Tooltip>
        <span 
          className="text-xl font-bold text-center"
          style={{ color: themeColors.text }}
        >
          {message}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
