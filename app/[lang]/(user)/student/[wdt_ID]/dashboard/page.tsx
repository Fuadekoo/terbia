"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BadgeCheckIcon, UserCheckIcon, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import useAction from "@/hooks/useAction";
import { getPackageData } from "@/actions/student/package";
import { getStudentProgressPerChapter } from "@/actions/student/progress";
import { useParams } from "next/navigation";

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

// Telegram theme hook
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

function CourseData() {
  const params = useParams();
  const wdt_ID = Number(params?.wdt_ID);
  const completecoursepersent = 66;
  const theme = useTelegramTheme();
  
  const [data, isLoading] = useAction(
    getPackageData,
    [true, (response) => console.log(response)],
    wdt_ID
  );

  // State to hold progress for all chapters
  const [chapterProgress, setChapterProgress] = React.useState<
    Record<string, boolean | null>
  >({});

  // Fetch progress for all chapters when data is loaded
  React.useEffect(() => {
    async function fetchAllProgress() {
      if (!data || !data.activePackage) return;
      const allChapters = data.activePackage.courses.flatMap(
        (course) => course.chapters
      );
      const progressEntries = await Promise.all(
        allChapters.map(async (chapter) => {
          const result = await getStudentProgressPerChapter(chapter.id, wdt_ID);
          return [chapter.id, result?.isCompleted ?? null] as [
            string,
            boolean | null
          ];
        })
      );
      setChapterProgress(Object.fromEntries(progressEntries));
    }
    fetchAllProgress();
  }, [data, wdt_ID]);

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

  return (
    <div className="m-4" style={{ background: themeColors.bg, color: themeColors.text }}>
      <div className="grid lg:grid-cols-2 gap-8">
        <Card 
          className="flex flex-col gap-2"
          style={{ 
            background: themeColors.secondaryBg, 
            borderColor: themeColors.link,
            color: themeColors.text 
          }}
        >
          <CardHeader>
            <CardTitle style={{ color: themeColors.text }}>In Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="flex gap-2">
              <span className="text-5xl" style={{ color: themeColors.link }}>
                <BookOpenCheck />
              </span>
              <div className="text-5xl font-bold" style={{ color: themeColors.text }}>
                100 <span className="text-xl" style={{ color: themeColors.hint }}>courses</span>
              </div>
            </div>
            <div>
              <Button 
                size="sm" 
                asChild
                style={{ 
                  background: themeColors.button, 
                  color: themeColors.buttonText 
                }}
              >
                <Link href="#">View All</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card
          style={{ 
            background: themeColors.secondaryBg,
            borderColor: themeColors.link,
            color: themeColors.text 
          }}
        >
          <CardHeader>
            <CardTitle style={{ color: themeColors.text }}>Completed</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="flex gap-2">
              <span className="text-5xl" style={{ color: themeColors.link }}>
                <BookOpenCheck />
              </span>
              <div className="text-5xl font-bold" style={{ color: themeColors.text }}>
                200 <span className="text-xl" style={{ color: themeColors.hint }}>courses</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {completecoursepersent > 50 ? (
              <span className="flex items-center gap-2" style={{ color: themeColors.link }}>
                <BadgeCheckIcon />
                Great job! Keep it up!
              </span>
            ) : (
              <span className="flex items-center gap-2" style={{ color: themeColors.hint }}>
                <UserCheckIcon />
                Keep pushing you are almost there!
              </span>
            )}
          </CardFooter>
        </Card>
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-4" style={{ color: themeColors.text }}>
          Active Course Package progress
        </h1>
        {!isLoading ? (
          !data ? (
            <div style={{ color: themeColors.text }}>No data found.</div>
          ) : "message" in data ? (
            <div 
              className="text-center text-lg py-10"
              style={{ color: themeColors.link }}
            >
              {/* {data.message} */}
            </div>
          ) : (
            <Accordion type="single" collapsible>
              <AccordionItem 
                value="item-1"
                style={{ borderColor: themeColors.secondaryBg }}
              >
                <AccordionTrigger style={{ color: themeColors.text }}>
                  {data.activePackage?.name}
                </AccordionTrigger>
                <AccordionContent>
                  {data.activePackage?.courses.map((course) => (
                    <div 
                      key={course.id} 
                      className="p-4 border-b"
                      style={{ borderColor: themeColors.secondaryBg }}
                    >
                      <h3 className="text-lg font-semibold" style={{ color: themeColors.text }}>
                        {course.title}
                      </h3>
                      <p className="text-sm" style={{ color: themeColors.hint }}>
                        {course.title}
                      </p>
                      <div>
                        {course.chapters.map((chapter) => {
                          const isCompleted = chapterProgress[chapter.id];

                          return (
                            <div 
                              key={chapter.id} 
                              className="p-4 border-b"
                              style={{ borderColor: themeColors.secondaryBg }}
                            >
                              <h3 className="text-lg font-semibold" style={{ color: themeColors.text }}>
                                {chapter.title}
                              </h3>
                              <p className="text-sm" style={{ color: themeColors.hint }}>
                                {chapter.title}
                              </p>
                              <span style={{ color: themeColors.text }}>
                                position: {chapter.position}
                              </span>
                              <span
                                className="ml-2 px-2 py-1 rounded text-xs font-semibold"
                                style={{
                                  background: isCompleted === true
                                    ? themeColors.link
                                    : isCompleted === false
                                    ? themeColors.hint
                                    : themeColors.secondaryBg,
                                  color: isCompleted === true
                                    ? themeColors.buttonText
                                    : themeColors.text,
                                }}
                              >
                                {isCompleted === true
                                  ? "Completed"
                                  : isCompleted === false
                                  ? "Not Completed"
                                  : "Not Started"}
                              </span>
                              {isCompleted === true ? (
                                <Link
                                  href={`/en/${wdt_ID}/${data.activePackage?.courses[0].id}/${chapter.id}`}
                                  className="hover:underline ml-4"
                                  style={{ color: themeColors.link }}
                                >
                                  View Chapter
                                </Link>
                              ) : (
                                <span 
                                  className="ml-4 cursor-not-allowed"
                                  style={{ color: themeColors.hint }}
                                >
                                  View Chapter
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )
        ) : (
          <div style={{ color: themeColors.text }}>Loading...</div>
        )}
      </div>
    </div>
  );
}

function Page() {
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

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen pt-[5px]"
      style={{ background: themeColors.bg, color: themeColors.text }}
    >
      {/* Injected styles for component theming */}
      <style jsx global>{`
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
      
      <h1 className="text-2xl font-bold mb-4" style={{ color: themeColors.text }}>
        This is a dashboard page
      </h1>
      <CourseData />
    </div>
  );
}

export default Page;
