import React from "react";
import { Volume, VolumeOff } from "lucide-react";

interface VolumeControlProps {
  volume: number; // 0 to 1
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  vertical?: boolean; // Show vertical slider on small screens
  iconSize?: number;
  buttonSize?: number;
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
  vertical = false,
  iconSize = 20,
  buttonSize = 36,
}) => {
  const sliderWidth = vertical ? 8 : 60;
  const sliderHeight = vertical ? 60 : 8;

  return (
    <div
      className="volume-control"
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        alignItems: "center",
        gap: vertical ? 4 : 8,
        position: vertical ? "relative" : "static",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMuteToggle();
        }}
        style={{
          background: "rgba(59, 130, 246, 0.6)",
          border: "none",
          color: "#fff",
          padding: 4,
          borderRadius: 4,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: buttonSize,
          height: buttonSize,
          minWidth: buttonSize,
          minHeight: buttonSize,
          flexShrink: 0,
        }}
      >
        {muted || volume === 0 ? <VolumeOff size={iconSize} /> : <Volume size={iconSize} />}
      </button>
      <div
        style={{
          position: "relative",
          width: sliderWidth,
          height: sliderHeight,
          display: "flex",
          alignItems: vertical ? "flex-end" : "center",
          justifyContent: vertical ? "center" : "flex-start",
        }}
      >
        {/* Background bar (darker sky blue) */}
        <div
          style={{
            position: "absolute",
            left: vertical ? 0 : 0,
            bottom: vertical ? 0 : 0,
            top: vertical ? 0 : 0,
            height: vertical ? "100%" : sliderHeight,
            width: vertical ? sliderWidth : "100%",
            background: "rgba(59, 130, 246, 0.3)", // Darker sky blue background
            borderRadius: 4,
            zIndex: 0,
          }}
        />
        {/* Volume bar (sky blue) */}
        <div
          style={{
            position: "absolute",
            left: vertical ? 0 : 0,
            bottom: vertical ? 0 : 0,
            top: vertical ? `${(1 - (muted ? 0 : volume)) * 100}%` : 0,
            height: vertical ? `${(muted ? 0 : volume) * 100}%` : sliderHeight,
            width: vertical ? sliderWidth : `${(muted ? 0 : volume) * 100}%`,
            background: "rgba(59, 130, 246, 0.8)", // Sky blue
            borderRadius: 4,
            zIndex: 1,
          }}
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => {
            e.stopPropagation();
            onVolumeChange(Number(e.target.value));
          }}
          style={{
            width: vertical ? sliderHeight : "100%",
            height: vertical ? sliderWidth : sliderHeight,
            background: "transparent",
            position: "relative",
            zIndex: 2,
            margin: 0,
            padding: 0,
            cursor: "pointer",
            outline: "none",
            WebkitAppearance: "none",
            appearance: "none",
            WebkitTapHighlightColor: "transparent", // Fix iPhone touch
            touchAction: "manipulation", // Fix iPhone touch
            transform: vertical ? "rotate(-90deg)" : "none",
            transformOrigin: "center",
            ...(vertical && {
              position: "absolute",
              left: "50%",
              top: "50%",
              marginLeft: `-${sliderHeight / 2}px`,
              marginTop: `-${sliderWidth / 2}px`,
            }),
          }}
        />
      </div>
    </div>
  );
};

export default VolumeControl;
