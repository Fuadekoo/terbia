import React from "react";
import { Play, Pause, ChevronRight, ChevronLeft } from "lucide-react";

interface ControlsProps {
  playing: boolean;
  onPlayPause: () => void;
  onSkip: (seconds: number) => void;
  onSpeedChange: () => void;
  speed: number;
  themeColors?: {
    button: string;
    buttonText: string;
    link: string;
  };
}

export default function Controls({
  playing,
  onPlayPause,
  onSkip,
  onSpeedChange,
  speed,
  themeColors,
}: ControlsProps) {
  const buttonColor = themeColors?.link || "#0ea5e9";
  const textColor = themeColors?.buttonText || "#fff";
  
  return (
    <div
      className="controls"
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSkip(-10);
        }}
        title="Skip Back 10s"
        className="hover:opacity-80 transition-opacity"
        style={{
          background: "rgba(0, 0, 0, 0.5)",
          border: "none",
          color: textColor,
          fontSize: 20,
          cursor: "pointer",
          padding: 6,
          borderRadius: 4,
        }}
      >
        <ChevronLeft />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlayPause();
        }}
        title={playing ? "Pause" : "Play"}
        className="hover:opacity-90 transition-opacity"
        style={{
          background: buttonColor,
          border: "none",
          color: textColor,
          fontSize: 24,
          cursor: "pointer",
          padding: 8,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 48,
          height: 48,
        }}
      >
        {playing ? <Pause /> : <Play />}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSkip(10);
        }}
        title="Skip Forward 10s"
        className="hover:opacity-80 transition-opacity"
        style={{
          background: "rgba(0, 0, 0, 0.5)",
          border: "none",
          color: textColor,
          fontSize: 20,
          cursor: "pointer",
          padding: 6,
          borderRadius: 4,
        }}
      >
        <ChevronRight />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSpeedChange();
        }}
        title="Change Speed"
        className="hover:opacity-80 transition-opacity"
        style={{
          background: "rgba(0, 0, 0, 0.5)",
          border: "none",
          color: textColor,
          fontSize: 16,
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 4,
        }}
      >
        {speed}x
      </button>
    </div>
  );
}
