"use client";
import React, { useEffect, useState } from "react";
import { retrieveLaunchParams } from "@telegram-apps/sdk";

function Page() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Get the start parameter from Telegram
      const launchParams = retrieveLaunchParams();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startParam = (launchParams as any)?.startParam;

      console.log("📱 Start parameter from Telegram:", startParam);

      if (startParam) {
        // Redirect to Terbia with the wdt_Id
        const redirectUrl = `https://terbia.darelkubra.com/en/student/${startParam}`;
        console.log("🚀 Redirecting to:", redirectUrl);
        window.location.href = redirectUrl;
      } else {
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
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Please open this from Telegram using the correct link.
          </p>
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
