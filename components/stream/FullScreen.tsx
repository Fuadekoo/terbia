import React from "react";
import { Maximize, Minimize } from "lucide-react";

interface FullscreenButtonProps {
  onClick: () => void;
  isFullscreen: boolean;
  size?: number;
  buttonSize?: number;
}

const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  onClick,
  isFullscreen,
  size = 20,
  buttonSize = 36,
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    style={{
      background: "rgba(135, 206, 235, 0.6)",
      border: "none",
      cursor: "pointer",
      fontSize: size,
      color: "#fff",
      padding: 4,
      borderRadius: 4,
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
    {isFullscreen ? <Minimize size={size} /> : <Maximize size={size} />}
  </button>
);

export default FullscreenButton;
