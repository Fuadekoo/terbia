"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";

export interface QualityOption {
  label: string;
  value: string;
  url: string;
}

export interface HlsLevel {
  width?: number;
  height?: number;
  bitrate?: number;
  name?: string;
}

interface QualitySelectorProps {
  qualities: QualityOption[];
  currentQuality: string;
  onQualityChange: (quality: string) => void;
  onBack: () => void;
  hlsLevels?: HlsLevel[];
  currentHlsLevel?: number;
  isHls?: boolean;
}

export default function QualitySelector({
  qualities,
  currentQuality,
  onQualityChange,
  onBack,
  hlsLevels = [],
  currentHlsLevel = -1,
  isHls = false,
}: QualitySelectorProps) {
  // Convert HLS levels to quality options
  const getHlsQualityOptions = (): QualityOption[] => {
    // Always show "Auto" option for HLS, even if levels aren't loaded yet
    const options: QualityOption[] = [
      { label: "Auto", value: "auto", url: "" },
    ];

    // If levels are available, add them
    if (hlsLevels.length > 0) {
      // Sort levels by height (highest first) for consistent display
      const sortedLevels = [...hlsLevels].sort((a, b) => {
        const heightA = a.height || 0;
        const heightB = b.height || 0;
        return heightB - heightA; // Descending order
      });

      sortedLevels.forEach((level, index) => {
        const height = level.height || 0;
        let label = "";

        if (height >= 1080) label = "1080p";
        else if (height >= 720) label = "720p";
        else if (height >= 480) label = "480p";
        else if (height >= 360) label = "360p";
        else if (height >= 270) label = "270p";
        else if (height >= 144) label = "144p";
        else if (height > 0) label = `${height}p`;
        else label = `Level ${index + 1}`;

        options.push({
          label,
          value: label, // Use the label directly as value (no bitrate info)
          url: "",
        });
      });
    } else if (isHls) {
      // If HLS but levels not loaded yet, show a loading message
      options.push({
        label: "Loading qualities...",
        value: "loading",
        url: "",
      });
    }

    return options;
  };

  const qualityOptions = isHls
    ? getHlsQualityOptions()
    : [{ label: "Auto", value: "auto", url: "" }, ...qualities];

  // Determine current quality display
  const getCurrentQualityValue = () => {
    if (isHls) {
      if (currentQuality === "auto") return "auto";
      if (currentHlsLevel === -1) return "auto";
      const level = hlsLevels[currentHlsLevel];
      if (level) {
        const height = level.height || 0;
        if (height >= 1080) return "1080p";
        if (height >= 720) return "720p";
        if (height >= 480) return "480p";
        if (height >= 360) return "360p";
        if (height >= 270) return "270p";
        if (height >= 144) return "144p";
      }
      return "auto";
    }
    return currentQuality;
  };

  const displayQuality = getCurrentQualityValue();

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
      {/* Header with Back Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 16px",
          borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onBack();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <ChevronLeft size={16} style={{ marginRight: "8px", color: "rgba(0, 0, 0, 0.7)" }} />
        <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Quality</span>
      </div>

      {/* Quality Options */}
      {qualityOptions.length === 0 ? (
        <div
          style={{
            padding: "12px 16px",
            color: "rgba(0, 0, 0, 0.5)",
            fontSize: "14px",
          }}
        >
          No quality options available
        </div>
      ) : (
        qualityOptions
          .filter((q) => q.value !== "loading") // Filter out loading option
          .map((quality) => {
            const isSelected = displayQuality === quality.value;
            return (
            <div
              key={quality.value}
              onClick={(e) => {
                e.stopPropagation();
                if (quality.value !== "loading") {
                  onQualityChange(quality.value);
                  // Stay on the selector menu to show the selection
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                cursor: "pointer",
                transition: "background 0.2s",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Radio Button - Always visible, YouTube-style */}
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  minWidth: "18px",
                  minHeight: "18px",
                  borderRadius: "50%",
                  border: isSelected
                    ? "2px solid rgba(59, 130, 246, 1)"
                    : "2px solid rgba(0, 0, 0, 0.3)",
                  marginRight: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  backgroundColor: isSelected
                    ? "rgba(59, 130, 246, 1)"
                    : "transparent",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      minWidth: "8px",
                      minHeight: "8px",
                      borderRadius: "50%",
                      background: "#ffffff",
                      display: "block",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: "14px",
                  color: isSelected
                    ? "rgba(0, 0, 0, 0.9)"
                      : "rgba(0, 0, 0, 0.7)",
                  fontWeight: isSelected ? 500 : 400,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {quality.label}
              </span>
            </div>
            );
          })
      )}
    </div>
  );
}
