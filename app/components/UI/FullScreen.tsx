"use client";

import { useEffect, useState } from "react";
import FullscreenIcon from "@mui/icons-material/Fullscreen";

export default function FullScreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request denied or blocked:", err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Check for physical 'F' key press directly in the native stack frame
      if (e.code === "KeyF" || e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (isFullscreen) return null;

  return (
    <div
      className="group fixed bottom-9 right-3 z-50 flex items-center justify-center rounded-full p-1 text-white shadow-lg cursor-pointer transition-transform active:scale-95"
      onClick={toggleFullscreen}
    >
      <span className="absolute inset-0 rounded-full border-2 border-white/60 pointer-events-none animate-[ping_2s_cubic-bezier(0,0,0.2,1)_3_forwards] group-hover:animate-[ping_1s_cubic-bezier(0,0,0.5,1)_infinite]" />
      <span className="absolute inset-0 rounded-full border border-white/40 pointer-events-none animate-[ping_2s_cubic-bezier(0,0,0.2,1)_3_forwards] [animation-delay:1s] group-hover:animate-[ping_1s_cubic-bezier(0,0,0.5,1)_infinite]" />
      <FullscreenIcon
        className="relative z-10 transition-transform duration-300 ease-out group-hover:scale-125 text-black"
        fontSize="medium"
      />
    </div>
  );
}
