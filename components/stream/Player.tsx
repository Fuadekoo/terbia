"use client";
import React, { useRef, useState, useEffect, memo } from "react";
import { Play, Pause } from "lucide-react";
import Playlist from "./Playlist";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import FullscreenButton from "./FullScreen";
import CustomSpinner from "./CustomSpinner";
import { VideoItem } from "../../types";
import { cn } from "@/lib/utils";

interface PlayerProps {
  src: string;
  type?: "url" | "local" | "direct";
  playlist?: VideoItem[];
  title?: string;
  onVideoPlay?: () => void;
  onVideoPause?: () => void;
  themeColors?: {
    bg: string;
    text: string;
    hint: string;
    link: string;
    button: string;
    buttonText: string;
    secondaryBg: string;
  };
}

function Player({
  src,
  type = "local",
  playlist = [],
  onVideoPlay,
  onVideoPause,
  themeColors,
}: // title,
PlayerProps) {
  // Use Telegram theme colors or defaults
  const buttonColor = themeColors?.button || "#0ea5e9";
  const linkColor = themeColors?.link || "#0ea5e9";
  const textColor = themeColors?.buttonText || "#fff";
  const secondaryBg = themeColors?.secondaryBg || "rgba(0, 0, 0, 0.5)";

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute the video source based on type
  let videoSrc = src;
  if (type === "local") {
    // For local videos, use the new videos API endpoint
    videoSrc = `/api/videos/${encodeURIComponent(src)}`;
  } else if (type === "url" && !src.startsWith("blob:")) {
    videoSrc = `/api/remote-stream?url=${encodeURIComponent(src)}`;
  } else if (type === "direct") {
    // For direct type, use the src as-is (for our custom video API endpoints)
    videoSrc = src;
  }

  // For blob URLs (uploaded files), use src directly

  const currentSrc =
    playlist.length > 0 ? playlist[currentVideoIndex]?.url : videoSrc;

  // Detect mobile and iOS specifically
  const isMobile =
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const isIOS =
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Hide controls after a few seconds on mobile
  useEffect(() => {
    if (!isMobile || !showControls || !playing) return;

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isMobile, playing]);

  // Network status detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Orientation detection for mobile fullscreen
  useEffect(() => {
    const handleOrientationChange = () => {
      // Add a small delay to ensure the orientation change is complete
      setTimeout(() => {
        if (isMobile) {
          const isCurrentlyLandscape = window.innerWidth > window.innerHeight;
          setIsLandscape(isCurrentlyLandscape);
          // Debug log
          console.log("Mobile orientation changed:", {
            isMobile,
            isFullscreen,
            isLandscape: isCurrentlyLandscape,
            width: window.innerWidth,
            height: window.innerHeight,
          });
        }
      }, 100);
    };

    // Initial check
    if (isMobile) {
      setIsLandscape(window.innerWidth > window.innerHeight);
    }

    // Listen for orientation changes
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, [isMobile, isFullscreen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const updateBuffered = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleError = () => setIsLoading(false);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("progress", updateBuffered);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("progress", updateBuffered);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleError);
    };
  }, [currentSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
  }, [speed, currentSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = muted;
    }
  }, [volume, muted]);

  // Fullscreen handlers
  const handleFullscreen = async () => {
    // iOS devices: use video element fullscreen for better experience
    if (isIOS && videoRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const video = videoRef.current as any;
      try {
        if (video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
          return;
        } else if (video.webkitRequestFullscreen) {
          video.webkitRequestFullscreen();
          return;
        }
      } catch (error) {
        console.error("iOS fullscreen error:", error);
      }
    }

    // Non-iOS devices: use video container or video element fullscreen
    // Prefer video container over outer container for better fullscreen experience
    const targetElement = videoContainerRef.current || containerRef.current || videoRef.current;
    if (!targetElement) {
      console.warn("No element available for fullscreen");
      return;
    }

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const element = targetElement as any;
        
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          await element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen();
        } else {
          console.warn("Fullscreen API not supported");
        }
      } else {
        // Exit fullscreen
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = document as any;
        
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
      // Try alternative: request fullscreen on video element
      if (!isFullscreen && videoRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const video = videoRef.current as any;
          if (video.requestFullscreen) {
            await video.requestFullscreen();
          } else if (video.webkitRequestFullscreen) {
            await video.webkitRequestFullscreen();
          }
        } catch (videoError) {
          console.error("Video fullscreen fallback error:", videoError);
        }
      }
    }
  };

  useEffect(() => {
    const handleChange = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = document as any;
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
      // Debug log
      console.log("Fullscreen changed:", {
        isFullscreen: isCurrentlyFullscreen,
        isMobile,
        isLandscape,
      });
    };

    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    document.addEventListener("mozfullscreenchange", handleChange);
    document.addEventListener("MSFullscreenChange", handleChange);

    // iOS-specific fullscreen events for video element
    const video = videoRef.current;
    if (isIOS && video) {
      const handleWebkitBeginFullscreen = () => {
        setIsFullscreen(true);
        console.log("iOS entered fullscreen");
      };
      const handleWebkitEndFullscreen = () => {
        setIsFullscreen(false);
        console.log("iOS exited fullscreen");
      };

      video.addEventListener(
        "webkitbeginfullscreen",
        handleWebkitBeginFullscreen
      );
      video.addEventListener("webkitendfullscreen", handleWebkitEndFullscreen);

      return () => {
        video.removeEventListener(
          "webkitbeginfullscreen",
          handleWebkitBeginFullscreen
        );
        video.removeEventListener(
          "webkitendfullscreen",
          handleWebkitEndFullscreen
        );
      };
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
      document.removeEventListener("mozfullscreenchange", handleChange);
      document.removeEventListener("MSFullscreenChange", handleChange);
    };
  }, [isMobile, isLandscape, isIOS]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    const video = videoRef.current;
    if (video) video.playbackRate = newSpeed;
  };

  const handleVolumeChange = (v: number) => setVolume(v);
  const handleMuteToggle = () => setMuted((m) => !m);

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = time;
    setCurrentTime(time);
  };

  const handleSelect = (idx: number) => {
    setCurrentVideoIndex(idx);
    setPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      ref={containerRef}
      className="video-player"
      style={{
        height: isFullscreen && isMobile && isLandscape ? "100vh" : "auto",
        width: isFullscreen && isMobile && isLandscape ? "100vw" : "100%",
      }}
    >
      <div
        ref={videoContainerRef}
        onMouseEnter={() => !isMobile && setShowControls(true)}
        onMouseLeave={() => !isMobile && setShowControls(false)}
        className={cn(
          "relative max-md:w-full",
          isFullscreen ? "md:w-full" : "md:w-[70%]"
        )}
        style={{
          height: isFullscreen && isMobile && isLandscape ? "100vh" : "auto",
          width: isFullscreen && isMobile && isLandscape ? "100vw" : "100%",
          position: "relative", // Critical for iOS
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          src={currentSrc}
          playsInline
          preload="metadata"
          webkit-playsinline="true"
          x-webkit-airplay="allow"
          width="100%"
          height="auto"
          style={{
            borderRadius: isFullscreen && isMobile && isLandscape ? 0 : 8,
            width: "100%",
            height: isFullscreen && isMobile && isLandscape ? "100vh" : "auto",
            objectFit:
              isFullscreen && isMobile && isLandscape ? "cover" : "contain",
            display: "block",
            position: "relative",
            zIndex: 1,
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
          onPlay={(e) => {
            e.stopPropagation();
            setPlaying(true);
            onVideoPlay?.();
          }}
          onPause={(e) => {
            e.stopPropagation();
            setPlaying(false);
            onVideoPause?.();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isMobile) setShowControls((v) => !v);
          }}
          onTouchStart={(e) => {
            // For iOS: show controls on touch
            if (isMobile) {
              e.stopPropagation();
              setShowControls((v) => !v);
            }
          }}
          onError={(e) => {
            console.error("Video load error:", e);
            setIsLoading(false);
          }}
        />

        {/* Center Play Button - Show when paused and not loading */}
        {!playing && !isLoading && isOnline && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              pointerEvents: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              style={{
                pointerEvents: "auto",
                background: "rgba(59, 130, 246, 0.6)", // More transparent blue
                border: "none",
                color: "#fff",
                fontSize: 24,
                borderRadius: "50%",
                width: 60,
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
                transition: "all 0.3s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                backdropFilter: "blur(5px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.6)";
              }}
              aria-label="Play"
            >
              <Play size={24} />
            </button>
          </div>
        )}

        {/* Loading Spinner Overlay */}
        {(isLoading || !isOnline) && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: buttonColor,
              borderRadius: "50%",
              width: "80px",
              height: "80px",
              pointerEvents: "none",
              boxShadow:
                `0 4px 20px ${buttonColor}cc, 0 0 30px ${buttonColor}4d`,
            }}
          >
            <CustomSpinner size={32} color={textColor} />
            {!isOnline && (
              <span
                style={{
                  color: textColor,
                  fontSize: "12px",
                  marginTop: "8px",
                  textAlign: "center",
                }}
              >
                No Network
              </span>
            )}
          </div>
        )}

        {/* --- MOBILE CONTROLS --- */}
        {isMobile && showControls && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              background: `${secondaryBg}66`,
              padding: "12px 16px",
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              zIndex: 50,
              WebkitTapHighlightColor: "transparent",
              backdropFilter: "blur(15px)",
            }}
          >
            {/* Play/Pause Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              title={playing ? "Pause" : "Play"}
              style={{
                background: buttonColor,
                border: "none",
                color: textColor,
                fontSize: 18,
                borderRadius: "50%",
                width: 44,
                height: 44,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 2px 8px ${buttonColor}33`,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                minHeight: "44px",
                minWidth: "44px",
              }}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Progress Bar Container */}
            <div
              style={{ 
                flex: 1, 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                gap: 4 
              }}
            >
              <ProgressBar
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                buffered={buffered}
              />
              {/* Time Display below progress bar */}
              <span style={{ 
                color: textColor, 
                fontSize: 12, 
                fontWeight: "500",
                alignSelf: "flex-start",
                marginLeft: 4
              }}>
                {formatTime(currentTime)}
              </span>
            </div>

            {/* Volume Control */}
            <VolumeControl
              volume={volume}
              muted={muted}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
            />

            {/* Fullscreen Button */}
            <FullscreenButton
              onClick={handleFullscreen}
              isFullscreen={isFullscreen}
            />
          </div>
        )}

        {/* --- DESKTOP CONTROLS --- */}
        {!isMobile && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? "auto" : "none",
              transition: "opacity 0.3s",
              background: `${secondaryBg}33`,
              padding: "8px 16px",
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              zIndex: 50,
            }}
          >
            {/* Play/Pause Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              title={playing ? "Pause" : "Play"}
              style={{
                background: buttonColor,
                border: "none",
                color: textColor,
                fontSize: 20,
                borderRadius: "50%",
                width: 40,
                height: 40,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 2px 8px ${buttonColor}4d`,
              }}
            >
              {playing ? <Pause /> : <Play />}
            </button>

            {/* Progress Bar */}
            <div
              style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}
            >
              <ProgressBar
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                buffered={buffered}
              />
            </div>

            {/* Time Display */}
            <span style={{ color: textColor, fontSize: 14, minWidth: 50 }}>
              -{formatTime(duration - currentTime)}
            </span>

            {/* Volume Control */}
            <VolumeControl
              volume={volume}
              muted={muted}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
            />

            {/* Speed Control */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                changeSpeed(speed >= 2 ? 1 : speed + 0.25);
              }}
              style={{
                background: secondaryBg,
                border: "none",
                color: textColor,
                fontSize: 14,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 4,
              }}
              title="Change Speed"
            >
              {speed}x
            </button>

            {/* Fullscreen Button */}
            <FullscreenButton
              onClick={handleFullscreen}
              isFullscreen={isFullscreen}
            />
          </div>
        )}
      </div>
      {playlist.length > 0 && (
        <div style={{ width: "100%", maxWidth: 640, marginTop: 16 }}>
          <Playlist
            videos={playlist}
            currentVideoId={playlist[currentVideoIndex]?.id}
            onSelect={(_id) => {
              const idx = playlist.findIndex((v) => v.id === _id);
              if (idx !== -1) handleSelect(idx);
            }}
          />
        </div>
      )}
    </div>
  );
}

// Memoize the Player component to prevent unnecessary re-renders
// This is crucial for preventing video refresh when parent form re-renders
export default memo(Player);
