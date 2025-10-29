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

  const handleVolumeIncrease = () => {
    const newVolume = Math.min(1, volume + 0.1);
    onVolumeChange(newVolume);
  };

  const handleVolumeDecrease = () => {
    const newVolume = Math.max(0, volume - 0.1);
    onVolumeChange(newVolume);
  };

  return (
    <div
      className="volume-control"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexDirection: "row", // Always horizontal
      }}
    >
      {/* Volume Decrease Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleVolumeDecrease();
        }}
        style={{
          background: "rgba(255, 255, 255, 0.2)",
          border: "none",
          padding: 6,
          cursor: "pointer",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "36px",
          minHeight: "36px",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
        title="Decrease Volume"
      >
        <span style={{ color: "#fff", fontSize: "16px", fontWeight: "bold" }}>-</span>
      </button>

      {/* Mute/Unmute Button */}
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
        title={muted ? "Unmute" : "Mute"}
      >
        {muted || volume === 0 ? (
          <VolumeOff size={20} color="#fff" />
        ) : (
          <Volume size={20} color="#fff" />
        )}
      </button>

      {/* Volume Increase Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleVolumeIncrease();
        }}
        style={{
          background: "rgba(255, 255, 255, 0.2)",
          border: "none",
          padding: 6,
          cursor: "pointer",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "36px",
          minHeight: "36px",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
        title="Increase Volume"
      >
        <span style={{ color: "#fff", fontSize: "16px", fontWeight: "bold" }}>+</span>
      </button>

      {/* Volume Slider (Desktop only) */}
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
            width: 60,
            height: 4,
            background: "rgba(255, 255, 255, 0.3)",
            borderRadius: 2,
            outline: "none",
            WebkitAppearance: "none",
            appearance: "none",
          }}
        />
      )}
    </div>
  );
};

export default VolumeControl;
