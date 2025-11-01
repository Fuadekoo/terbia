"use client";
import React from "react";
import Image from "next/image";
import { Search, Bell } from "lucide-react";

interface ProfileHeaderProps {
  name: string;
  role?: string;
  hasNotification?: boolean;
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
  hasNotification = false,
  themeColors,
}: ProfileHeaderProps) {
  // Use Telegram theme colors or defaults
  const bgColor = themeColors?.bg || "#1a1a1a";
  const textColor = themeColors?.text || "#ffffff";
  const hintColor = themeColors?.hint || "#9ca3af";
  const linkColor = themeColors?.link || "#0ea5e9";

  return (
    <div
      className="w-full px-4 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md"
      style={{
        background: `${bgColor}f0`,
        borderBottom: `1px solid ${themeColors?.secondaryBg || "#374151"}40`,
      }}
    >
      {/* Left Side - Profile */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
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
          <p
            className="text-sm truncate"
            style={{ color: hintColor }}
          >
            {role}
          </p>
        </div>
      </div>

      {/* Right Side - Icons */}
      <div className="flex items-center gap-3">
        {/* Search Icon */}
        <button
          className="p-2 rounded-full transition-all duration-200 hover:opacity-80"
          style={{
            background: "transparent",
            border: `1px solid ${hintColor}40`,
          }}
          aria-label="Search"
        >
          <Search
            className="w-5 h-5"
            style={{ color: textColor }}
          />
        </button>

        {/* Notification Bell */}
        <button
          className="p-2 rounded-full transition-all duration-200 hover:opacity-80 relative"
          style={{
            background: "transparent",
            border: `1px solid ${hintColor}40`,
          }}
          aria-label="Notifications"
        >
          <Bell
            className="w-5 h-5"
            style={{ color: textColor }}
          />
          {/* Notification Dot */}
          {hasNotification && (
            <span
              className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
              style={{
                background: "#ef4444",
                boxShadow: "0 0 0 2px " + bgColor,
              }}
            />
          )}
        </button>
      </div>
    </div>
  );
}

