// Your page.jsx
"use client";
import { getQuestionForActivePackageFinalExam } from "@/actions/student/test";
import FinalExamForm from "@/components/custom/student/FinalExamForm";
import useAction from "@/hooks/useAction";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";

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
  // Renamed from 'page' to 'Page' for React component naming convention
  const params = useParams();
  const router = useRouter();
  const wdt_ID = Number(params?.wdt_ID);
  const lang = typeof params?.lang === "string" ? params.lang : "en";
  // Guard against a literal "undefined" segment reaching the server action.
  const rawPackageId = params?.coursesPackageId;
  const coursesPackageId =
    typeof rawPackageId === "string" && rawPackageId !== "undefined"
      ? rawPackageId
      : "";
  const theme = useTelegramTheme();

  // Assuming getQuestionForActivePackageFinalExam returns an object like { coursesPackage: { questions: [...] } }
  const [data, refetch, isLoading] = useAction(
    getQuestionForActivePackageFinalExam,
    [
      true,
      (response) => {
        try {
          if (response === undefined) {
            alert("እባክዎ ማጠቃለያ ፈተናውን ለመውሰድ ቅድሚያ ትምህርቱን ይጨርሱ፡፡");
          }
          console.log("API Response:", response);
        } catch (error) {
          console.error("Error in refetch callback:", error);
        }
      },
    ], // Log response here
    wdt_ID,
    coursesPackageId
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

  // --- Loading, Error, and No Data States ---
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center pt-[5px]"
        style={{ background: themeColors.bg }}
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
        
        <p className="text-xl" style={{ color: themeColors.text }}>
          የፈተና ጥያቄዎችን በማቅረብ ላይ ነው...
        </p>
      </div>
    );
  }

  // Ensure data structure is correct before passing
  if (
    !data ||
    !data.coursesPackage ||
    !Array.isArray(data.coursesPackage.questions) ||
    data.coursesPackage.questions.length === 0
  ) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 pt-[5px]"
        style={{ background: themeColors.bg }}
      >
        <div
          className="p-8 rounded-2xl shadow-lg text-center max-w-md w-full"
          style={{ background: themeColors.secondaryBg }}
        >
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center text-3xl"
            style={{ background: `${themeColors.link}20` }}
          >
            ⏳
          </div>
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: themeColors.text }}
          >
            ማጠቃለያ ፈተናው በቅርቡ ይለቀቃል
          </h2>
          <p className="leading-relaxed mb-2" style={{ color: themeColors.text }}>
            የመጨረሻው ፈተና ገና አልተጫነም። እባክዎ በትዕግስት ይጠብቁ — በቅርቡ ይመጣል።
          </p>
          <p className="leading-relaxed mb-6" style={{ color: themeColors.hint }}>
            እስከዚያው ድረስ ሌሎች ትምህርቶችዎን መማርዎን ይቀጥሉ።
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push(`/${lang}/student/${wdt_ID}/dashboard`)}
              className="w-full py-3 rounded-xl font-semibold transition-opacity"
              style={{
                background: themeColors.button,
                color: themeColors.buttonText,
              }}
            >
              ወደ ትምህርት ተመለስ
            </button>
            <button
              onClick={() => refetch()}
              className="w-full py-3 rounded-xl font-medium no-theme border transition-opacity"
              style={{
                background: "transparent",
                color: themeColors.link,
                borderColor: themeColors.hint,
              }}
            >
              እንደገና ሞክር
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Add a 'number' property to each question for display
  const questionsWithNumbers = data.coursesPackage.questions.map(
    (q, index) => ({
      ...q,
      number: index + 1,
    })
  );
  const feedback = data.answerCorrection || undefined;
  const updateProhibition = data.updateProhibition || false;
  return (
    <FinalExamForm
      coursesPackage={{
        questions: questionsWithNumbers, // Pass the augmented questions
      }}
      wdt_ID={wdt_ID}
      coursesPackageId={coursesPackageId}
      packageName={data?.packageName}
      examDurationMinutes={data?.coursesPackage?.examDurationMinutes ?? 0}
      feedback={feedback}
      updateProhibition={updateProhibition}
      refresh={refetch}
    />
  );
}

export default Page;
