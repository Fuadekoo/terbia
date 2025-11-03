"use client";
import React from "react";
import Image from "next/image";
import { ArrowLeft, Newspaper, Bot } from "lucide-react";

interface ProfileHeaderProps {
  name: string;
  role?: string;
  showBackButton?: boolean;
  chatId?: string | null;
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
  onNewsClick,
  onAIClick,
  themeColors,
}: ProfileHeaderProps) {
  // Build the Telegram deep link with chatId
  const backUrl = chatId
    ? `https://t.me/darulkubrabot?startapp=${chatId}`
    : "https://t.me/darulkubrabot?startapp=";

  // Use Telegram theme colors or defaults
  const bgColor = themeColors?.bg || "#1a1a1a";
  const textColor = themeColors?.text || "#ffffff";
  const hintColor = themeColors?.hint || "#9ca3af";
  const linkColor = themeColors?.link || "#0ea5e9";

  return (
    <div
      className="w-full px-4 pb-3 pt-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md profile-header"
      style={{
        background: `${bgColor}f0`,
        borderBottom: `1px solid ${themeColors?.secondaryBg || "#374151"}40`,
      }}
    >
      {/* Left Side - Back Button + Profile */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Back Button */}
        {showBackButton && (
          <a href={backUrl} className="flex-shrink-0">
            <button
              className="p-2 rounded-full transition-all duration-200 hover:opacity-80"
              style={{
                background: `${linkColor}20`,
                border: `1px solid ${linkColor}40`,
              }}
              aria-label="Back to Darelkubra"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: linkColor }} />
            </button>
          </a>
        )}

        {/* Profile Picture */}
        <div className="relative flex-shrink-0">
          <Image
            src="/userProfileIcon.png"
            alt={name}
            width={48}
            height={48}
            className="rounded-full object-cover"
            style={{
              border: `2px solid ${linkColor}40`,
            }}
          />
        </div>

        {/* Name and Role */}
        <div className="flex-1 min-w-0">
          <h2
            className="text-base font-bold truncate"
            style={{ color: textColor }}
          >
            {name}
          </h2>
          <p className="text-sm truncate" style={{ color: hintColor }}>
            {role}
          </p>
        </div>
      </div>

      {/* Right Side - News & AI Icons */}
      <div className="flex items-center gap-2">
        {/* News Icon */}
        {onNewsClick && (
          <button
            onClick={onNewsClick}
            className="p-2 rounded-full transition-all duration-200 hover:opacity-80"
            style={{
              background: `${linkColor}15`,
              border: `1px solid ${linkColor}30`,
            }}
            aria-label="News"
          >
            <Newspaper className="w-4 h-4" style={{ color: linkColor }} />
          </button>
        )}

        {/* AI/Chat Icon */}
        {onAIClick && (
          <button
            onClick={onAIClick}
            className="p-2 rounded-full transition-all duration-200 hover:opacity-80"
            style={{
              background: `${linkColor}15`,
              border: `1px solid ${linkColor}30`,
            }}
            aria-label="AI Assistant"
          >
            <Bot className="w-4 h-4" style={{ color: linkColor }} />
          </button>
        )}
      </div>
    </div>
  );
}
