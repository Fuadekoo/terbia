"use client";
import React, { useEffect, useState } from "react";

function Page() {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    try {
      let wdtId: string | null = null;
      const debugMessages: string[] = [];

      // Method 1: Check URL hash parameter
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        debugMessages.push(`Hash: ${hash}`);

        if (hash.includes("tgWebAppStartParam=")) {
          const match = hash.match(/tgWebAppStartParam=([^&]+)/);
          if (match && match[1]) {
            wdtId = decodeURIComponent(match[1]);
            debugMessages.push(`✅ Found in hash: ${wdtId}`);
          }
        }
      }

      // Method 2: Check Telegram WebApp
      if (!wdtId && typeof window !== "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tg = (window as any)?.Telegram?.WebApp;
        debugMessages.push(`Telegram WebApp available: ${!!tg}`);

        if (tg) {
          // Try initDataUnsafe.start_param
          const startParam = tg.initDataUnsafe?.start_param;
          debugMessages.push(`start_param: ${startParam}`);

          if (startParam) {
            wdtId = startParam;
            debugMessages.push(
              `✅ Found in initDataUnsafe.start_param: ${wdtId}`
            );
          }
        }
      }

      // Method 3: Parse initData string
      if (!wdtId && typeof window !== "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tg = (window as any)?.Telegram?.WebApp;

        if (tg?.initData) {
          debugMessages.push(`initData: ${tg.initData}`);
          const params = new URLSearchParams(tg.initData);
          const startParamFromInit = params.get("start_param");

          if (startParamFromInit) {
            wdtId = startParamFromInit;
            debugMessages.push(`✅ Found in initData: ${wdtId}`);
          }
        }
      }

      console.log("🔍 Debug Info:", debugMessages.join(" | "));
      setDebugInfo(debugMessages.join("\n"));

      if (wdtId) {
        // Redirect to Terbia with the wdt_Id
        const redirectUrl = `https://terbia.darelkubra.com/en/student/${wdtId}`;
        console.log("🚀 Redirecting to:", redirectUrl);

        // Small delay to show loading state
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      } else {
        console.warn("⚠️ No wdt_ID found");
        setError("No wdt_ID found in start parameter");
      }
    } catch (err) {
      console.error("❌ Error getting start parameter:", err);
      setError("Failed to get student ID from Telegram");
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-red-100 dark:bg-red-900/20">
            <svg
              className="w-12 h-12 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Please open this from Telegram using the correct link format:
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
              https://t.me/MubareksBot?startapp=wdt_Id
            </code>
          </div>
          {debugInfo && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                Debug Info (Click to expand)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto text-gray-700 dark:text-gray-300">
                {debugInfo}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: "#3b82f6" }}
          />
          <div
            className="absolute inset-0 rounded-full animate-spin border-4 border-transparent"
            style={{
              borderTopColor: "#3b82f6",
              borderRightColor: "#3b82f6",
            }}
          />
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Redirecting to Terbia...
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please wait a moment
        </p>
      </div>
    </div>
  );
}

export default Page;
