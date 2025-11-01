"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

interface StudentData {
  wdt_ID: number;
  name: string;
  subject: string;
  package: string;
  isKid: boolean;
  activePackage?: {
    id: string;
    name: string;
    courses: {
      id: string;
      title: string;
      chapters: {
        id: string;
        title: string;
      }[];
    }[];
  };
}

function Page({ params }: { params: { wdt_ID: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);

  useEffect(() => {
    const initData = searchParams?.get("initData");

    if (!initData) {
      setError("No Telegram init data provided");
      setLoading(false);
      return;
    }

    // Validate init data and get user info
    const validateAndGetUser = async () => {
      try {
        const response = await fetch("/api/telegram/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initData }),
        });

        if (!response.ok) {
          throw new Error("Failed to validate init data");
        }

        const data = await response.json();
        setTelegramUser(data.user);

        // Get student data
        const studentResponse = await fetch(`/api/student/${params.wdt_ID}`);
        if (!studentResponse.ok) {
          throw new Error("Failed to get student data");
        }

        const student = await studentResponse.json();
        setStudentData(student);

        // Redirect to active course if available
        if (student.activePackage?.courses?.[0]?.chapters?.[0]) {
          const courseId = student.activePackage.courses[0].id;
          const chapterId = student.activePackage.courses[0].chapters[0].id;
          router.push(`/en/student/${params.wdt_ID}/${courseId}/${chapterId}`);
        } else {
          setError("No active course found for this student");
        }
      } catch (err) {
        console.error("Error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    validateAndGetUser();
  }, [searchParams, params.wdt_ID, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading your course...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <h1>
        this is a page for student but i went to redirect to student active
        course chapter page
      </h1>
    </div>
  );
}

export default Page;
