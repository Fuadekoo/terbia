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
        height: 6,
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Background bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 6,
          width: "100%",
          background: "rgba(255, 255, 255, 0.3)",
          borderRadius: 3,
          zIndex: 0,
        }}
      />
      {/* Buffered bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 6,
          width: `${bufferedPercent}%`,
          background: "rgba(255, 255, 255, 0.5)",
          borderRadius: 3,
          zIndex: 1,
        }}
      />
      {/* Played bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 6,
          width: `${playedPercent}%`,
          background: "rgba(255, 255, 255, 0.8)",
          borderRadius: 3,
          zIndex: 2,
        }}
      />
      {/* Red dot indicator at current position */}
      <div
        style={{
          position: "absolute",
          left: `${playedPercent}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 12,
          height: 12,
          background: "#ef4444", // Red color like in image
          borderRadius: "50%",
          zIndex: 4,
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
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
          height: 6,
          margin: 0,
          padding: 0,
          cursor: "pointer",
          outline: "none",
          WebkitAppearance: "none",
          appearance: "none",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      />
    </div>
  );
};

export default ProgressBar;
