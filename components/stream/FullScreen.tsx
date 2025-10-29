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
      e.preventDefault();
      onClick();
    }}
    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    style={{
      background: "rgba(255, 255, 255, 0.2)",
      border: "none",
      cursor: "pointer",
      fontSize: 22,
      color: "#fff",
      padding: 8,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "44px",
      minHeight: "44px",
      WebkitTapHighlightColor: "transparent",
      touchAction: "manipulation",
      zIndex: 10,
    }}
  >
    {isFullscreen ? (
      <Minimize size={20} color="#fff" />
    ) : (
      <Maximize size={20} color="#fff" />
    )}
  </button>
);

export default FullscreenButton;
