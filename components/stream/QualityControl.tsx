"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type QualityLevel = "auto" | "HD" | "360p" | "144p";

interface QualityControlProps {
  currentQuality: QualityLevel;
  availableLevels?: QualityLevel[]; // make optional to avoid undefined map errors
  onQualityChange: (quality: QualityLevel) => void;
  networkSpeed?: number; // in Mbps
  className?: string;
}

const qualityLabels: Record<QualityLevel, string> = {
  auto: "Auto",
  HD: "HD (1080p)",
  "360p": "360p",
  "144p": "144p",
};

const qualityBitrates: Record<QualityLevel, number> = {
  auto: 0, // Will be determined automatically
  HD: 5000, // 5 Mbps
  "360p": 800, // 800 kbps
  "144p": 250, // 250 kbps
};

export default function QualityControl({
  currentQuality,
  availableLevels,
  onQualityChange,
  networkSpeed,
  className,
}: QualityControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Ensure only allowed levels are shown and keep Auto first
  const allowed: QualityLevel[] = ["auto", "HD", "360p", "144p"];
  const safeLevels: QualityLevel[] = useMemo(() => {
    const set = new Set<QualityLevel>(allowed);
    const provided = (availableLevels ?? []).filter((q): q is QualityLevel => set.has(q));
    const levels = provided.length > 0 ? provided : allowed;
    const uniq: QualityLevel[] = [];
    const pushUniq = (q: QualityLevel) => {
      if (!uniq.includes(q)) uniq.push(q);
    };
    pushUniq("auto");
    levels.forEach((q) => pushUniq(q));
    return uniq;
  }, [availableLevels]);

  // Auto-detect network speed and suggest quality
  // This is handled by the HLS player component itself
  // This effect is kept for potential future use
  useEffect(() => {
    if (currentQuality === "auto" && networkSpeed !== undefined) {
      // Auto quality switching is handled by HLS.js in the player
      // This component just displays the current state
    }
  }, [networkSpeed, currentQuality]);

  // Close the menu with Escape for better UX
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white text-sm transition-colors"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Quality settings"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">
          {qualityLabels[currentQuality]}
        </span>
        {networkSpeed !== undefined && currentQuality === "auto" && (
          <span className="hidden md:inline text-xs opacity-75">
            ({networkSpeed.toFixed(1)} Mbps)
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div role="menu" className="absolute bottom-full right-0 mb-2 z-50 bg-black/95 rounded-lg shadow-lg min-w-[160px] overflow-hidden">
            {safeLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  onQualityChange(level);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between",
                  currentQuality === level && "bg-white/20"
                )}
                role="menuitemradio"
                aria-checked={currentQuality === level}
              >
                <span>{qualityLabels[level]}</span>
                {currentQuality === level && <Check className="w-4 h-4" />}
              </button>
            ))}
            {networkSpeed !== undefined && (
              <div className="px-4 py-2 text-xs text-white/60 border-t border-white/10">
                Network: {networkSpeed.toFixed(1)} Mbps
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export { qualityLabels, qualityBitrates };
