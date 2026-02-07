"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

interface SettingsMenuProps {
  currentQuality: string;
  currentSpeed: number;
  onQualityClick: () => void;
  onSpeedClick: () => void;
  isHls?: boolean;
  hlsLevels?: any[];
  currentHlsLevel?: number;
}

export default function SettingsMenu({
  currentQuality,
  currentSpeed,
  onQualityClick,
  onSpeedClick,
  isHls = false,
  hlsLevels = [],
  currentHlsLevel = -1,
}: SettingsMenuProps) {
  const getSpeedLabel = (speed: number) => {
    if (speed === 1) return "Normal";
    return `${speed}x`;
  };

  const getQualityLabel = () => {
    if (isHls && hlsLevels.length > 0) {
      if (currentQuality === "auto") {
        return "Auto";
      }
      if (currentHlsLevel === -1) {
        return "Auto";
      }
      const level = hlsLevels[currentHlsLevel];
      if (level) {
        const height = level.height || 0;
        if (height >= 1080) return "1080p";
        if (height >= 720) return "720p";
        if (height >= 480) return "480p";
        if (height >= 360) return "360p";
        if (height >= 270) return "270p";
        return `${height}p`;
      }
      return "Auto";
    }
    return currentQuality === "auto" ? "Auto" : currentQuality;
  };

  return (
    <div
      data-settings-menu
      style={{
        position: "absolute",
        bottom: "60px",
        right: "16px",
        background: "rgba(255, 255, 255, 0.98)",
        borderRadius: "8px",
        padding: "8px 0",
        minWidth: "200px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
        zIndex: 200,
      }}
    >
      {/* Triangular tail pointing to settings icon */}
      <div
        style={{
          position: "absolute",
          bottom: "-8px",
          right: "20px",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid rgba(255, 255, 255, 0.98)",
          filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
        }}
      />
      {/* Quality Option */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onQualityClick();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "2px",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            Quality
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "rgba(0, 0, 0, 0.6)",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {getQualityLabel()}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "rgba(0, 0, 0, 0.4)" }} />
      </div>

      {/* Speed Option */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSpeedClick();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "2px",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            Speed
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "rgba(0, 0, 0, 0.6)",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {getSpeedLabel(currentSpeed)}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "rgba(0, 0, 0, 0.4)" }} />
      </div>
    </div>
  );
}
