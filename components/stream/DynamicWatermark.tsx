"use client";
import React, { useState, useEffect, useRef } from "react";
import { useWatermarkStore } from "@/stores/useWatermarkStore";

interface Position {
  top: number;
  left: number;
}

const DynamicWatermark: React.FC = () => {
  // Get data from watermark store (which reads from cookies)
  const { userData, getFormattedTimestamp } = useWatermarkStore();
  
  const [position, setPosition] = useState<Position>({ top: 10, left: 10 });
  const [isVisible, setIsVisible] = useState(false); // Control visibility
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is logged in (has data in cookies)
  const isLoggedIn = !!(userData.username || userData.phoneNumber || userData.fullName);

  // Get user info from cookies/store
  const getUserInfo = () => {
    if (!isLoggedIn) {
      return {
        message: "The video is protected by Darulkubra",
      };
    }

    // Get full name from store
    const fullName = userData.fullName || userData.username || "Unknown";

    // Format phone number (mask middle digits for privacy)
    const phoneNumber = userData.phoneNumber || "N/A";
    const maskedPhone =
      phoneNumber.length > 4
        ? `${phoneNumber.slice(0, 2)}***${phoneNumber.slice(-2)}`
        : phoneNumber;

    // Get timestamp from store (login time from local PC)
    const timestamp = getFormattedTimestamp();

    return {
      fullName,
      phoneNumber: maskedPhone,
      timestamp,
    };
  };

  // Generate random position
  const generateRandomPosition = (): Position => {
    try {
      // Get the video player container (parent element with position: relative)
      const container = containerRef.current?.parentElement;
      
      if (!container) {
        // Fallback: use window dimensions if container not found
        const watermarkWidth = 250;
        const watermarkHeight = isLoggedIn ? 80 : 40;
        const padding = 20;
        const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 400;
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 640;
        const maxTop = Math.max(padding, windowHeight - watermarkHeight - padding);
        const maxLeft = Math.max(padding, windowWidth - watermarkWidth - padding);
        
        return {
          top: Math.max(padding, Math.floor(Math.random() * maxTop)),
          left: Math.max(padding, Math.floor(Math.random() * maxLeft)),
        };
      }

      // Get container dimensions
      const rect = container.getBoundingClientRect();
      const containerHeight = rect.height || container.clientHeight || 400;
      const containerWidth = rect.width || container.clientWidth || 640;
      
      const watermarkWidth = 250; // Approximate width of watermark
      const watermarkHeight = isLoggedIn ? 80 : 40; // Height varies based on content

      // Generate random position with padding
      const padding = 20;
      const maxTop = Math.max(padding, containerHeight - watermarkHeight - padding);
      const maxLeft = Math.max(padding, containerWidth - watermarkWidth - padding);

      // Ensure valid values
      const top = Math.max(padding, Math.min(maxTop, Math.floor(Math.random() * maxTop)));
      const left = Math.max(padding, Math.min(maxLeft, Math.floor(Math.random() * maxLeft)));

      return { top, left };
    } catch (error) {
      console.error('Error generating watermark position:', error);
      // Return safe default position
      return { top: 20, left: 20 };
    }
  };

  // Show/hide cycle: Show for 5 seconds, hide for 10 seconds, repeat
  useEffect(() => {
    // Mark as mounted
    setIsMounted(true);

    // Initial position - wait a bit for container to render
    const updatePosition = () => {
      setTimeout(() => {
        const newPosition = generateRandomPosition();
        setPosition(newPosition);
      }, 100);
    };

    // Function to show watermark
    const showWatermark = () => {
      // Update position before showing (new random position each time)
      updatePosition();
      setIsVisible(true);
      
      // Hide after 5 seconds
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        
        // After hiding, wait 10 seconds then show again
        if (showTimeoutRef.current) {
          clearTimeout(showTimeoutRef.current);
        }
        showTimeoutRef.current = setTimeout(() => {
          showWatermark(); // Recursive call to continue the cycle
        }, 10000); // Wait 10 seconds before showing again
      }, 5000); // Show for 5 seconds
    };

    // Set initial position
    setTimeout(() => {
      updatePosition();
    }, 500);

    // Start the cycle: Wait 10 seconds initially, then show for 5 seconds
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
    }
    showTimeoutRef.current = setTimeout(() => {
      showWatermark();
    }, 10000); // Initial wait: 10 seconds before first show

    // Cleanup
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isLoggedIn, userData]);

  const userInfo = getUserInfo();

  // Don't render until mounted
  if (!isMounted) {
    return null;
  }

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="dynamic-watermark"
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
        pointerEvents: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        transition: "opacity 0.3s ease-in-out, top 0.5s ease-in-out, left 0.5s ease-in-out",
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden",
        display: isVisible ? "block" : "none",
      }}
    >
      <div
        style={{
          // Match title watermark style - transparent, no background
          color: "rgba(255, 255, 255, 0.3)",
          fontSize: "14px",
          fontWeight: 600,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          lineHeight: "1.4",
          textAlign: "left",
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
          whiteSpace: "nowrap",
        }}
      >
        {isLoggedIn && userInfo.fullName ? (
          <div>
            <div>{userInfo.fullName}</div>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px" }}>
              {userInfo.phoneNumber} • {userInfo.timestamp}
            </div>
          </div>
        ) : (
          <div>{userInfo.message}</div>
        )}
      </div>
    </div>
  );
};

export default DynamicWatermark;

