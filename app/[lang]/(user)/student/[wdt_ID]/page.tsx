"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  chooseStudentPackage,
  getStudentFlowById,
} from "@/actions/student/telegram";
import { Loader2 } from "lucide-react";
import { retrieveRawInitData } from "@telegram-apps/sdk";
import { Progress } from "@/components/ui/progress";
import ProfileHeader from "@/components/custom/student/ProfileHeader";

type TGInitData = { chat?: { id?: number }; user?: { id?: number } };

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
  initDataUnsafe?: TGInitData;
  themeParams?: TelegramThemeParams;
  ready?: () => void;
  expand?: () => void;
  // Official Telegram Mini Apps API methods
  requestTheme?: () => void;
  setHeaderColor?: (color: string | { color_key: string }) => void;
  setBackgroundColor?: (color: string | { color_key: string }) => void;
  onEvent?: (
    event: string,
    handler: (event?: TelegramThemeChangedEvent) => void
  ) => void;
  offEvent?: (
    event: string,
    handler: (event?: TelegramThemeChangedEvent) => void
  ) => void;
}

interface TelegramWindow {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

type StartSingle = {
  success: true;
  data: {
    mode: "single";
    url: string;
    packageName: string;
    studentId: number;
    studentName: string | null;
  };
};
type StartChoose = {
  success: true;
  data: {
    mode: "choose";
    students: Array<{
      studentId: number;
      name: string | null;
      avatar: { initials: string; color: string };
      packages: Array<{
        id: string;
        name: string;
        progressPercentage?: number;
      }>;
      subject?: string | null;
      teacherName?: string | null;
      classFee?: string | null;
    }>;
  };
};
type StartError = { success: false; error: string };

type HasData = StartSingle | StartChoose;
const hasData = (
  res: StartSingle | StartChoose | StartError | null
): res is HasData => {
  return !!res && res.success === true;
};

// Professional Telegram theme hook using official Telegram Web App script
function useTelegramTheme() {
  const [theme, setTheme] = useState<TelegramThemeParams>({});

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let retryTimeout: NodeJS.Timeout | undefined;
    const maxRetries = 50; // Maximum 5 seconds of retries (50 * 100ms)
    let retryCount = 0;

    // Wait for the Telegram script to load
    const initializeTelegramWebApp = () => {
      if (typeof window === "undefined") return;

      const w = window as unknown as TelegramWindow;
      const webApp = w.Telegram?.WebApp;

      if (!webApp) {
        // Retry after a short delay if script hasn't loaded yet
        if (retryCount < maxRetries) {
          retryCount++;
          retryTimeout = setTimeout(initializeTelegramWebApp, 100);
        }
        return;
      }

      // Initialize WebApp using official API
      if (webApp.ready) {
        webApp.ready();
      }
      if (webApp.expand) {
        webApp.expand();
      }

      // Function to update theme and set Mini App colors
      const updateTheme = (themeParams?: TelegramThemeParams) => {
        // Use theme from event or directly from webApp.themeParams
        const currentTheme = themeParams || webApp.themeParams;

        if (currentTheme) {
          setTheme(currentTheme);

          // Set Mini App header color using official API: web_app_set_header_color
          if (webApp.setHeaderColor) {
            webApp.setHeaderColor(
              currentTheme.button_color || currentTheme.bg_color || "#ffffff"
            );
          }

          // Set Mini App background color using official API: web_app_set_background_color
          if (webApp.setBackgroundColor) {
            webApp.setBackgroundColor(currentTheme.bg_color || "#ffffff");
          }
        }
      };

      // Get initial theme from themeParams (official API property)
      if (webApp.themeParams) {
        updateTheme(webApp.themeParams);
      }

      // Official method: web_app_request_theme
      // This triggers the theme_changed event with updated theme_params
      if (webApp.requestTheme) {
        webApp.requestTheme();
      }

      // Official event: theme_changed
      // Event payload contains theme_params property
      const handleThemeChanged = (event?: TelegramThemeChangedEvent) => {
        if (event?.theme_params) {
          // Use theme_params from event payload
          updateTheme(event.theme_params);
        } else if (webApp.themeParams) {
          // Fallback: use themeParams directly if event doesn't have it
          updateTheme();
        }
      };

      // Register event listener for theme_changed event
      if (webApp.onEvent) {
        webApp.onEvent("theme_changed", handleThemeChanged);
        // Also support camelCase for compatibility
        webApp.onEvent("themeChanged", handleThemeChanged);
      }

      // Setup cleanup function
      cleanup = () => {
        if (webApp.offEvent) {
          webApp.offEvent("theme_changed", handleThemeChanged);
          webApp.offEvent("themeChanged", handleThemeChanged);
        }
      };
    };

    // Start initialization
    initializeTelegramWebApp();

    // Return cleanup function
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return theme;
}

export default function Page() {
  const params = useParams();
  const wdt_ID = params?.wdt_ID ? Number(params.wdt_ID) : null;

  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startRes, setStartRes] = useState<
    StartSingle | StartChoose | StartError | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const [pendingChoice, setPendingChoice] = useState<string | null>(null);

  // Use professional Telegram theme hook
  const theme = useTelegramTheme();

  useEffect(() => {
    // Get chatId from Telegram - prioritize Telegram chat ID for database access
    if (typeof window !== "undefined") {
      const w = window as unknown as TelegramWindow;

      // 1) Try to get from Telegram SDK (most reliable)
      try {
        const raw = retrieveRawInitData();
        if (raw) {
          const params = new URLSearchParams(raw);
          const chatJson = params.get("chat") || params.get("user");
          if (chatJson) {
            const parsed = JSON.parse(chatJson) as { id?: number };
            if (parsed?.id) {
              const telegramChatId = String(parsed.id);
              console.log("✅ Using Telegram chatId from SDK:", telegramChatId);
              setChatId(telegramChatId);
              return;
            }
          }
        }
      } catch (err) {
        console.log("⚠️ Could not retrieve from SDK:", err);
      }

      // 2) Try Telegram WebApp initDataUnsafe
      const unsafe = w.Telegram?.WebApp?.initDataUnsafe;
      const telegramId = unsafe?.chat?.id ?? unsafe?.user?.id;
      if (telegramId) {
        console.log("✅ Using Telegram chatId from WebApp:", telegramId);
        setChatId(String(telegramId));
      } else {
        // 3) Not in Telegram - use wdt_ID as fallback (for browser access)
        console.log("ℹ️ Not in Telegram, using wdt_ID as identifier:", wdt_ID);
        setChatId(String(wdt_ID));
      }
    }
  }, [wdt_ID]);

  useEffect(() => {
    const run = async () => {
      if (!chatId) return;

      console.log(
        "🔄 Fetching student data using chatId:",
        chatId,
        "for wdt_ID:",
        wdt_ID
      );
      setLoading(true);
      setError(null);

      try {
        // Use chatId (from Telegram or wdt_ID fallback) to access database
        // The backend supports both Telegram chatId and browser wdt_ID access
        const res = await getStudentFlowById(chatId, wdt_ID!);
        console.log("✅ Data fetched successfully:", res.success);
        setStartRes(res as StartSingle | StartChoose | StartError);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        setError("Failed to start flow");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [chatId, wdt_ID]);

  // Removed extra profile pre-list rendering to keep UI minimal/professional

  const handleChoose = async (studentId: number, packageId: string) => {
    // Use chatId (from Telegram) for database operations
    const identifier = chatId || String(wdt_ID);
    if (!identifier) return;

    console.log(
      "📝 Choosing package using chatId:",
      identifier,
      "for student:",
      studentId
    );
    setLoading(true);
    setError(null);
    setPendingChoice(`${studentId}:${packageId}`);
    try {
      // Call backend with chatId - backend handles both Telegram and browser access
      const r = await chooseStudentPackage(identifier, studentId, packageId);
      if (r.success) {
        console.log("✅ Package chosen successfully, redirecting to:", r.url);
        window.location.href = r.url;
      } else {
        console.error("❌ Failed to choose package:", r.error);
        setError(r.error);
      }
    } catch (err) {
      console.error("❌ Error choosing package:", err);
      setError("Failed to set package");
    } finally {
      setLoading(false);
      setPendingChoice(null);
    }
  };

  const singleData =
    hasData(startRes) && startRes.data.mode === "single" ? startRes.data : null;
  const chooseData =
    hasData(startRes) && startRes.data.mode === "choose" ? startRes.data : null;

  // Auto-redirect when there is a single package path
  useEffect(() => {
    if (!singleData) return;
    window.location.href = singleData.url;
  }, [singleData]);

  // Professional theme utilities with memoization for performance
  const themeColors = useMemo(() => {
    // Detect if theme is light or dark
    let isLightTheme = true;
    if (theme.bg_color) {
      try {
        const bgHex = theme.bg_color.replace("#", "");
        const bgValue = parseInt(bgHex, 16);
        // If RGB average is below 0x888888, it's dark
        const r = (bgValue >> 16) & 0xff;
        const g = (bgValue >> 8) & 0xff;
        const b = bgValue & 0xff;
        const avg = (r + g + b) / 3;
        isLightTheme = avg > 128 || theme.bg_color.toLowerCase() === "#ffffff";
      } catch {
        // Default to light if parsing fails
        isLightTheme = true;
      }
    }

    return {
      bg: theme.bg_color || "#ffffff",
      text: theme.text_color || (isLightTheme ? "#000000" : "#ffffff"),
      hint: theme.hint_color || (isLightTheme ? "#999999" : "#aaaaaa"),
      link: theme.link_color || "#0ea5e9",
      button: theme.button_color || "#0ea5e9",
      buttonText: theme.button_text_color || "#ffffff",
      secondaryBg:
        theme.secondary_bg_color || (isLightTheme ? "#f0f0f0" : "#1a1a1a"),
    };
  }, [theme]);

  // Helper functions for easy access
  const getBgColor = () => themeColors.bg;
  const getTextColor = () => themeColors.text;
  const getHintColor = () => themeColors.hint;
  const getLinkColor = () => themeColors.link;
  const getButtonColor = () => themeColors.button;
  const getButtonTextColor = () => themeColors.buttonText;
  const getSecondaryBgColor = () => themeColors.secondaryBg;

  return (
    <div
      style={{
        background: getBgColor(),
        color: getTextColor(),
        minHeight: "100vh",
      }}
    >
      {/* Global styles for fullscreen */}
      <style jsx global>{`
        /* Hide header in fullscreen mode */
        :fullscreen .profile-header,
        :-webkit-full-screen .profile-header,
        :-moz-full-screen .profile-header,
        :-ms-fullscreen .profile-header {
          display: none !important;
        }
      `}</style>

      {/* Profile Header */}
      {chooseData && chooseData.students.length === 1 && (
        <ProfileHeader
          name={chooseData.students[0].name || "Student"}
          role="Student"
          chatId={chatId}
          themeColors={{
            bg: getBgColor(),
            text: getTextColor(),
            hint: getHintColor(),
            link: getLinkColor(),
            button: getButtonColor(),
            buttonText: getButtonTextColor(),
            secondaryBg: getSecondaryBgColor(),
          }}
        />
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        {error && (
          <div
            style={{
              padding: 12,
              border: `1px solid ${getSecondaryBgColor()}`,
              background: getSecondaryBgColor(),
              color: getTextColor(),
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading && (
            <div
              style={{
                padding: 12,
                border: `1px solid ${getSecondaryBgColor()}`,
                borderRadius: 8,
                color: getTextColor(),
              }}
            >
              Loading...
            </div>
          )}

          {!loading && startRes && startRes.success === false && (
            <div
              style={{
                padding: 16,
                border: `1px solid ${getSecondaryBgColor()}`,
                borderRadius: 12,
                background: getSecondaryBgColor(),
                color: getTextColor(),
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Access not granted
              </div>
              <div>
                {startRes.error ||
                  "Your account does not have access to the course yet."}
              </div>
              <div
                style={{ fontSize: 12, color: getHintColor(), marginTop: 8 }}
              >
                Please contact the admin to enable your access.
              </div>
            </div>
          )}

          {!loading && singleData && (
            <div
              style={{
                padding: 12,
                border: `1px solid ${getSecondaryBgColor()}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: getTextColor(),
              }}
            >
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />{" "}
              Redirecting...
            </div>
          )}

          {!loading && chooseData && chooseData.students.length > 1 && (
            <div className="pt-10">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 24,
                  justifyItems: "center",
                }}
              >
                {chooseData.students.map((s) => (
                  <button
                    key={s.studentId}
                    onClick={() => {
                      if (s.packages.length === 1) {
                        handleChoose(s.studentId, s.packages[0].id);
                      } else {
                        // Navigate to this student's page with wdt_ID
                        window.location.href = `/en/student/${s.studentId}`;
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <Image
                      src="/userProfileIcon.png"
                      alt={s.name || "Student avatar"}
                      width={120}
                      height={120}
                      style={{
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: `4px solid ${getLinkColor()}`,
                        boxShadow: `0 10px 24px ${getLinkColor()}40`,
                        display: "block",
                        margin: "0 auto",
                        background: getSecondaryBgColor() || "#e0f2fe",
                      }}
                    />
                    <div
                      style={{
                        marginTop: 10,
                        color: getLinkColor(),
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      {s.name || "Student"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && chooseData && chooseData.students.length === 1 && (
            <div>
              {/* Package Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                  gap: 18,
                }}
              >
                {chooseData.students[0].packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      background: getSecondaryBgColor() || "#ffffff",
                      border: `1px solid ${getSecondaryBgColor()}`,
                      borderRadius: 14,
                      overflow: "hidden",
                      boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ height: 140, position: "relative" }}>
                      <Image
                        src="/quranlogo.png"
                        alt="Package thumbnail"
                        fill
                        style={{ objectFit: "cover" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          background: `${getBgColor()}d9`,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderTop: "10px solid transparent",
                            borderBottom: "10px solid transparent",
                            borderLeft: `16px solid ${getLinkColor()}`,
                            marginLeft: 4,
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ padding: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: getLinkColor(),
                            background: getSecondaryBgColor() || "#e0f2fe",
                            border: `1px solid ${getSecondaryBgColor()}`,
                            padding: "4px 10px",
                            borderRadius: 9999,
                          }}
                        >
                          beginner
                        </span>
                        <span style={{ fontSize: 12, color: getTextColor() }}>
                          ⭐ 4.8
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            color: getTextColor(),
                            lineHeight: 1.35,
                            fontSize: 18,
                            flex: 1,
                          }}
                        >
                          {pkg.name}
                        </div>
                        <div
                          style={{
                            color: getLinkColor(),
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Available
                        </div>
                      </div>
                      <div
                        style={{
                          color: getHintColor(),
                          fontSize: 13,
                          marginTop: 8,
                        }}
                      >
                        Kickstart your learning with engaging lessons and
                        hands-on practice.
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <span style={{ fontSize: 12, color: getHintColor() }}>
                            {pkg.progressPercentage ?? 0}%
                          </span>
                        </div>
                        <Progress value={pkg.progressPercentage ?? 0} />
                      </div>
                      <button
                        onClick={() =>
                          handleChoose(chooseData.students[0].studentId, pkg.id)
                        }
                        style={{
                          width: "100%",
                          marginTop: 14,
                          padding: "12px 14px",
                          background: getButtonColor(),
                          color: getButtonTextColor(),
                          border: "none",
                          borderRadius: 10,
                          cursor: "pointer",
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                        disabled={
                          pendingChoice ===
                          `${chooseData.students[0].studentId}:${pkg.id}`
                        }
                      >
                        {pendingChoice ===
                        `${chooseData.students[0].studentId}:${pkg.id}` ? (
                          <>
                            <Loader2
                              size={16}
                              style={{ animation: "spin 1s linear infinite" }}
                            />{" "}
                            Continuing...
                          </>
                        ) : (
                          "continue Learning"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
