"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import Certificate from "@/components/Certificate";
import getCertificateData from "@/actions/student/certificate";
import { useParams } from "next/navigation";
import useAction from "@/hooks/useAction";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

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

export default function CertificatePage() {
  const params = useParams();
  const wdt_ID = Number(params?.wdt_ID);
  const coursesPackageId = String(params?.coursesPackageId);
  const theme = useTelegramTheme();

  const [data] = useAction(
    getCertificateData,
    [true, (response) => console.log("fetched data", response)],
    wdt_ID,
    coursesPackageId
  );

  const certRef = useRef<HTMLDivElement>(null);

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

  const handleDownload = async () => {
    const node = certRef.current;
    if (!node) return;

    // Force desktop layout for export
    node.classList.add("force-desktop");

    window.scrollTo(0, 0); // Prevent clipping on mobile

    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "px",
          format: [img.width, img.height],
        });

        pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
        pdf.save("certificate.pdf");
      };
    } catch (error) {
      console.error("Failed to generate certificate:", error);
    } finally {
      node.classList.remove("force-desktop");
    }
  };

  const studentName = data?.sName;
  const studentId = data?.studId;
  const packageName = data?.cName;
  const packageId = data?.cId;
  const startTime = data?.startTime.toLocaleDateString();
  const endTime = data?.endTime.toLocaleDateString();
  const score = data?.result.score;
  const correct = data?.result.correct;
  const total = data?.result.total;

  if (
    !studentName ||
    !studentId ||
    !packageId ||
    !packageName ||
    !startTime ||
    !endTime ||
    !score ||
    !correct ||
    !total
  ) {
    return null;
  }

  return (
    <div 
      className="md:ml-35 overflow-y-auto min-h-screen pt-[5px]"
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
      
      <Link
        href={`/en/student/${studentId}/profile`}
        className="flex items-center text-sm hover:opacity-75 transition mb-6 mt-4 ml-4"
        style={{ color: themeColors.link }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        ወደ ፕሮፋይል ገጽ
      </Link>

      <h1 
        className="text-xl font-bold m-4"
        style={{ color: themeColors.text }}
      >
        Generated Certificate
      </h1>

      <button
        className="flex md:hidden mx-4 px-4 py-2 rounded gap-2"
        style={{ 
          background: themeColors.button, 
          color: themeColors.buttonText 
        }}
        onClick={handleDownload}
      >
       <Download className=""/>
        Certificate as PDF
      </button>

      <div ref={certRef} className="mx-4 overflow-hidden certificate-container">
        <Certificate
          studentName={studentName}
          packageName={packageName}
          correct={correct}
          total={total}
          score={score}
          startDate={startTime}
          endDate={endTime}
        />
      </div>

      <button
        className="hidden md:flex mb-8 mx-4 px-4 py-2 rounded gap-2"
        style={{ 
          background: themeColors.button, 
          color: themeColors.buttonText 
        }}
        onClick={handleDownload}
      >
        <Download className=""/>
        Certificate as PDF
      </button>
    </div>
  );
}
