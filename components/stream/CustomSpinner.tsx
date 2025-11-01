"use client";
import React from "react";
import { Loader2 } from "lucide-react";

interface CustomSpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function CustomSpinner({
  size = 32,
  color = "#fff",
  className = "",
}: CustomSpinnerProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Spinning ring */}
      <div
        style={{
          position: "absolute",
          width: size,
          height: size,
          border: `${size * 0.08}px solid rgba(255, 255, 255, 0.2)`,
          borderTop: `${size * 0.08}px solid ${color}`,
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      {/* Static icon in center */}
      <Loader2
        size={size * 0.5}
        color={color}
        style={{
          position: "relative",
          zIndex: 1,
        }}
      />
    </div>
  );
}
