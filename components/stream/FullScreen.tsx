import React from "react";
import { Maximize, Minimize } from "lucide-react";

interface FullscreenButtonProps {
  onClick: () => void;
  isFullscreen: boolean;
}

const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  onClick,
  isFullscreen,
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
      fontSize: 20,
      color: "#fff",
      padding: 4,
      borderRadius: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
  </button>
);

export default FullscreenButton;
