"use client";
import React from "react";
import Image from "next/image";
import { ArrowLeft, Newspaper, Bot } from "lucide-react";

interface ProfileHeaderProps {
  name: string;
  role?: string;
  showBackButton?: boolean;
  chatId?: string | null;
  studentId?: number | null;
  onNewsClick?: () => void;
  onAIClick?: () => void;
  themeColors?: {
    bg: string;
    text: string;
    hint: string;
    link: string;
    button: string;
    buttonText: string;
    secondaryBg: string;
  };
}

export default function ProfileHeader({
  name,
  role = "Student",
  showBackButton = true,
  chatId,
  studentId,
  onNewsClick,
  onAIClick,
  themeColors,
}: ProfileHeaderProps) {
  // The bot's start_param is read back as a wdt_ID, so send the student id here.
  // chatId is only a fallback for callers that don't know the student id.
  const startParam = studentId ?? chatId;
  const backUrl = startParam
    ? `https://t.me/darulkubrabot?startapp=${startParam}`
    : "https://t.me/darulkubrabot?startapp=";

  // Use Telegram theme colors or defaults
  const bgColor = themeColors?.bg || "#1a1a1a";
  const textColor = themeColors?.text || "#ffffff";
  const hintColor = themeColors?.hint || "#9ca3af";
  const linkColor = themeColors?.link || "#0ea5e9";

  // Shared styling for the circular icon buttons on both ends of the header.
  const iconButtonClass =
    "grid place-items-center size-9 rounded-full transition-all duration-200 " +
    "hover:brightness-110 active:scale-95 focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-offset-1";
  const iconButtonStyle = {
    background: `${linkColor}1a`,
    border: `1px solid ${linkColor}33`,
    // Keeps the focus ring visible on any Telegram background
    ["--tw-ring-color" as string]: `${linkColor}80`,
    ["--tw-ring-offset-color" as string]: bgColor,
  } as React.CSSProperties;

  return (
    <div
      className="profile-header sticky top-0 z-50 flex w-full items-center justify-between gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl"
      style={{
        background: `${bgColor}f0`,
        borderBottom: `1px solid ${themeColors?.secondaryBg || "#374151"}40`,
      }}
    >
      {/* Left — back button + identity */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showBackButton && (
          <a
            href={backUrl}
            className={`${iconButtonClass} shrink-0`}
            style={iconButtonStyle}
            aria-label="Back to Darelkubra"
          >
            <ArrowLeft className="size-4.5" style={{ color: linkColor }} />
          </a>
        )}

        <div className="relative shrink-0">
          <Image
            src="/userProfileIcon.png"
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-full object-cover"
            style={{ border: `2px solid ${linkColor}40` }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className="truncate text-[0.9375rem] font-semibold leading-tight"
            style={{ color: textColor }}
          >
            {name}
          </h2>
          <p
            className="truncate text-xs leading-tight"
            style={{ color: hintColor }}
          >
            {role}
          </p>
        </div>
      </div>

      {/* Right — quick actions */}
      <div className="flex shrink-0 items-center gap-2">
        {onNewsClick && (
          <button
            type="button"
            onClick={onNewsClick}
            className={iconButtonClass}
            style={iconButtonStyle}
            aria-label="News"
          >
            <Newspaper className="size-4" style={{ color: linkColor }} />
          </button>
        )}

        {onAIClick && (
          <button
            type="button"
            onClick={onAIClick}
            className={iconButtonClass}
            style={iconButtonStyle}
            aria-label="AI Assistant"
          >
            <Bot className="size-4" style={{ color: linkColor }} />
          </button>
        )}
      </div>
    </div>
  );
}
