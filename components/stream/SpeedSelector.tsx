"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";

interface SpeedSelectorProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  onBack: () => void;
}

const speedOptions = [
  { label: "0.25x", value: 0.25 },
  { label: "0.5x", value: 0.5 },
  { label: "0.75x", value: 0.75 },
  { label: "Normal", value: 1 },
  { label: "1.25x", value: 1.25 },
  { label: "1.5x", value: 1.5 },
  { label: "1.75x", value: 1.75 },
  { label: "2x", value: 2 },
];

export default function SpeedSelector({
  currentSpeed,
  onSpeedChange,
  onBack,
}: SpeedSelectorProps) {
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
        <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
          Speed
        </span>
      </div>

      {/* Speed Options with Radio Buttons */}
      {speedOptions.map((option) => {
        const isSelected = Math.abs(currentSpeed - option.value) < 0.01;
        return (
          <div
            key={option.value}
            onClick={(e) => {
              e.stopPropagation();
              onSpeedChange(option.value);
              // Stay on the selector menu to show the selection
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
            {/* Radio Button - Always visible with clear styling */}
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
                    borderRadius: "50%",
                    background: "#ffffff",
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontSize: "14px",
                color: isSelected ? "rgba(0, 0, 0, 0.9)" : "rgba(0, 0, 0, 0.7)",
                fontWeight: isSelected ? 500 : 400,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {option.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
