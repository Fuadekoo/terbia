import React from "react";
import { Volume, VolumeOff } from "lucide-react";

interface VolumeControlProps {
  volume: number; // 0 to 1
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
}) => {
  const isMobile =
    typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);

  return (
    <div
      className="volume-control"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMuteToggle();
        }}
        style={{
          background: "rgba(255, 255, 255, 0.2)",
          border: "none",
          padding: 8,
          cursor: "pointer",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "44px",
          minHeight: "44px",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        {muted || volume === 0 ? (
          <VolumeOff size={20} color="#fff" />
        ) : (
          <Volume size={20} color="#fff" />
        )}
      </button>
      {!isMobile && (
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
            width: 80,
            height: "auto",
          }}
        />
      )}
    </div>
  );
};

export default VolumeControl;
