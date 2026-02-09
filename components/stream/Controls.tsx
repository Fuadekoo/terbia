import React from "react";
import { Play, Pause } from "lucide-react";

interface ControlsProps {
  playing: boolean;
  onPlayPause: () => void;
  onSpeedChange: () => void;
  speed: number;
}

export default function Controls({
  playing,
  onPlayPause,
  onSpeedChange,
  speed,
}: ControlsProps) {
  return (
    <div
      className="controls"
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlayPause();
        }}
        title={playing ? "Pause" : "Play"}
        style={{
          background: "rgba(135, 206, 235, 0.8)", // Sky blue background
          border: "none",
          color: "#fff",
          fontSize: 24,
          borderRadius: "50%",
          width: 48,
          height: 48,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(135, 206, 235, 0.3)",
        }}
      >
        {playing ? <Pause /> : <Play />}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSpeedChange();
        }}
        title="Change Speed"
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: 16,
          cursor: "pointer",
          padding: "4px 8px",
        }}
      >
        {speed}x
      </button>
    </div>
  );
}
