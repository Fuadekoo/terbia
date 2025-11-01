"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import useAction from "@/hooks/useAction";
import getProfile from "@/actions/student/profile";

import StudentHeader from "@/components/custom/student/profile/StudentHeader";
import StatsCard from "@/components/custom/student/profile/StatsCard";
import CourseCard from "@/components/custom/student/profile/CourseCard";
import CourseSection from "@/components/custom/student/profile/CourseSection";

import { BookOpen, CheckCircle, GraduationCap } from "lucide-react";
import AttendanceSummary from "@/components/custom/student/profile/AttendanceSummary";
import { cn } from "@/lib/utils";

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

function Page() {
  const params = useParams();
  const studentId = Number(params?.wdt_ID ?? 0);
  const theme = useTelegramTheme();

  const [data, , loading] = useAction(
    getProfile,
    [true, (response) => console.log(response)],
    studentId
  );

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

  if (loading) {
    return (
      <div 
        className="p-6 text-center min-h-screen pt-[5px]"
        style={{ background: themeColors.bg, color: themeColors.hint }}
      >
        Loading profile...
      </div>
    );
  }
  console.log("Profile data:", data);

  if (!data) {
    return (
      <div 
        className="p-6 text-center min-h-screen pt-[5px]"
        style={{ background: themeColors.bg, color: themeColors.link }}
      >
        Failed to load profile.
      </div>
    );
  }

  const {
    studentProfile,
    completedPackageNames,
    completedPackageIdss,
    resultOfCompletedPackage,
    inProgressPackages,
    totalNumberOfCompletedPackage,
    totalNumberOfThePackage,
    averageGrade,
    complationDates,
    attendances,
  } = data;

  if (!studentProfile.name) {
    return (
      <div 
        className="p-6 text-center min-h-screen pt-[5px]"
        style={{ background: themeColors.bg, color: themeColors.link }}
      >
        Failed to load profile.
      </div>
    );
  }
  const currentCourses = inProgressPackages.map((pkg) => ({
    title: pkg.packageId.name,
    instructor: pkg.oustazName,
    chapters: `${pkg.noOfChapters} chapters`,
    progress: pkg.percent,
  }));

  const completedCourses = completedPackageNames.map((pkg, idx) => ({
    title: pkg.pName,
    instructor: pkg.oustazName,
    chapters: `${pkg.noOfChapters} chapters`,
    completed: complationDates[idx],
    result: `${resultOfCompletedPackage[idx].correct}/${resultOfCompletedPackage[idx].total} (${resultOfCompletedPackage[idx].score}%)`,
    url: `/en/student/${studentId}/certificates/${completedPackageIdss[idx]}`,
  }));
  const colorMap = {
    blue: "text-blue-600 bg-blue-100 border-blue-100",
    green: "text-green-600 bg-green-100 border-green-100",
  };

  return (
    <div 
      className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 overflow-y-auto pt-[5px]"
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
      
      {/* Header */}
      <StudentHeader
        name={studentProfile.name}
        phone={studentProfile.phoneno ?? ""}
        id={studentProfile.wdt_ID}
      />

      {/* Stats */}
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 mb-8 lg:grid-cols-4",
          attendances.present === 0 &&
            attendances.absent === 0 &&
            " grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-8"
        )}
      >
        <StatsCard
          label="Total Courses"
          value={totalNumberOfThePackage}
          icon={<BookOpen className="w-5 h-5 text-blue-600" />}
        />
        <StatsCard
          label="Completed"
          value={totalNumberOfCompletedPackage}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
        />
        <StatsCard
          label="Average Grade in %"
          value={`${averageGrade.toFixed(2)} %`}
          icon={<GraduationCap className="w-5 h-5 text-yellow-500" />}
        />
        <AttendanceSummary
          present={attendances.present}
          absent={attendances.absent}
        />
      </div>

      {/* Current Courses */}
      {currentCourses.length > 0 && (
        <CourseSection
          title="Current Courses"
          badge={`${
            totalNumberOfThePackage - totalNumberOfCompletedPackage
          } active`}
          badgeColor={colorMap.blue}
        >
          {currentCourses.map((course, idx) => (
            <CourseCard
              key={idx}
              {...course}
              instructor={course.instructor.filter(Boolean).join(", ")} // removes nulls and joins
            />
          ))}
        </CourseSection>
      )}

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <CourseSection
          title="Completed Courses"
          badge={`${totalNumberOfCompletedPackage} completed`}
          badgeColor="green"
        >
          {completedCourses.map((course, idx) => (
            <CourseCard
              key={idx}
              {...course}
              instructor={course.instructor.filter(Boolean).join(", ")}
              isCompleted
            />
          ))}
        </CourseSection>
      )}
    </div>
  );
}

export default Page;
