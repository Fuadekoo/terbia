import React from "react";

interface ProgressBarProps {
  currentTime: number; // in seconds
  duration: number; // in seconds
  onSeek: (time: number) => void;
  buffered?: number; // in seconds
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  buffered = 0,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSeek(Number(e.target.value));
  };

  // Calculate buffered percent
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;
  const playedPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="progress-bar"
      style={{
        position: "relative",
        flex: 1,
        height: 8,
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Background bar (darker sky blue) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 8,
          width: "100%",
          background: "rgba(59, 130, 246, 0.3)", // Darker sky blue background
          borderRadius: 4,
          zIndex: 0,
        }}
      />
      {/* Buffered bar (sky blue) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 8,
          width: `${bufferedPercent}%`,
          background: "rgba(59, 130, 246, 0.6)", // Sky blue
          borderRadius: 4,
          zIndex: 1,
        }}
      />
      {/* Played bar (bright sky blue) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 8,
          width: `${playedPercent}%`,
          background: "rgba(59, 130, 246, 0.9)", // Bright sky blue
          borderRadius: 4,
          zIndex: 2,
        }}
      />
      {/* Range input */}
      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={handleChange}
        style={{
          width: "100%",
          background: "transparent",
          position: "relative",
          zIndex: 3,
          height: 8,
          margin: 0,
          padding: 0,
          cursor: "pointer",
          outline: "none",
          WebkitAppearance: "none",
          appearance: "none",
          WebkitTapHighlightColor: "transparent", // Fix iPhone touch
          touchAction: "manipulation", // Fix iPhone touch
        }}
      />
    </div>
  );
};

export default ProgressBar;
