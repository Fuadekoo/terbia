"use client";

import React from "react";
import { MessageCircle, Calendar, User } from "lucide-react";
import { getAnnouncements } from "@/actions/student/courseData";
import useAction from "@/hooks/useAction";

interface Announcement {
  id: string;
  anouncementDescription: string;
  createdAt: Date;
}

export default function CourseAnnouncements({
  courseId,
  lang,
  themeColors,
}: {
  courseId: string;
  lang: string;
  themeColors?: {
    bg: string;
    text: string;
    hint: string;
    link: string;
    button: string;
    buttonText: string;
    secondaryBg: string;
  };
}) {
  // Use Telegram theme colors or defaults
  const bgColor = themeColors?.bg || "#ffffff";
  const textColor = themeColors?.text || "#000000";
  const hintColor = themeColors?.hint || "#6b7280";
  const linkColor = themeColors?.link || "#0ea5e9";
  const secondaryBg = themeColors?.secondaryBg || "#f3f4f6";

  const [announcements, , loading] = useAction(
    getAnnouncements,
    [true, () => {}],
    courseId
  );
  //   const { data: announcements, loading } = useData({
  //     func: getAnnouncements,
  //     args: [courseId],
  //   });

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center h-64"
        style={{ background: bgColor }}
      >
        <div 
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: linkColor }}
        ></div>
      </div>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <div 
        className="text-center py-12"
        style={{ background: bgColor }}
      >
        <MessageCircle 
          className="w-16 h-16 mx-auto mb-4"
          style={{ color: hintColor }}
        />
        <h3 
          className="text-xl font-medium mb-2"
          style={{ color: textColor }}
        >
          {lang === "en" ? "No Announcements Yet" : "አንድም ማሳወቂያ የለም"}
        </h3>
        <p style={{ color: hintColor }}>
          {lang === "en"
            ? "Check back later for updates from your instructor"
            : "ከአስተማሪዎ ዝመናዎችን ለማግኘት በኋላ በድጋሚ ይመለሱ"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={{ background: bgColor }}>
      {announcements.map((announcement: Announcement) => (
        <div
          key={announcement.id}
          className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
          style={{
            background: secondaryBg,
            borderColor: `${hintColor}30`,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `${linkColor}20` }}
              >
                <MessageCircle 
                  className="w-5 h-5"
                  style={{ color: linkColor }}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <User className="w-4 h-4" style={{ color: hintColor }} />
                <span 
                  className="text-sm font-medium"
                  style={{ color: textColor }}
                >
                  {lang === "en" ? "Instructor" : "አስተማሪ"}
                </span>
                <div 
                  className="w-1 h-1 rounded-full"
                  style={{ background: hintColor }}
                ></div>
                <div 
                  className="flex items-center gap-1 text-sm"
                  style={{ color: hintColor }}
                >
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(announcement.createdAt).toLocaleDateString(
                      lang === "en" ? "en-US" : "am-ET",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
              </div>
              <p 
                className="whitespace-pre-wrap text-sm leading-relaxed"
                style={{ color: textColor }}
              >
                {announcement.anouncementDescription}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
