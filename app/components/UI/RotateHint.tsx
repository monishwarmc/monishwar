"use client";

import ScreenRotationIcon from "@mui/icons-material/ScreenRotation";
import { useState } from "react";
import { useSession } from "../contexts/SessionContext";
import { useIsTouch } from "../hooks/useIsTouch";
import { useIsPortrait } from "../hooks/useOrientation";
import { enterFullscreen } from "./fullscreen";

/**
 * Asks for landscape while exploring on a phone. The button retries the
 * fullscreen + orientation lock (a user gesture is required, so it cannot be
 * done automatically), and "Play anyway" is there for devices — iPhones, or a
 * phone with rotation locked in the OS — where the lock can never succeed.
 */
const RotateHint = () => {
  const { exploring } = useSession();
  const isTouch = useIsTouch();
  const isPortrait = useIsPortrait();

  const [dismissed, setDismissed] = useState(false);
  const [wasExploring, setWasExploring] = useState(exploring);

  // Adjusting state during render (rather than in an effect) is React's own
  // recipe for resetting state when a prop changes: a fresh explore session
  // should ask for landscape again.
  if (wasExploring !== exploring) {
    setWasExploring(exploring);
    setDismissed(false);
  }

  if (!exploring || !isTouch || !isPortrait || dismissed) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/85 px-8 text-center text-white backdrop-blur-sm">
      <ScreenRotationIcon style={{ fontSize: 64 }} className="animate-pulse" />

      <div className="space-y-2">
        <p className="text-xl font-semibold">Rotate your phone</p>
        <p className="text-sm text-white/70">
          The controls need landscape to fit on screen.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => void enterFullscreen()}
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black active:scale-95"
        >
          Go fullscreen &amp; rotate
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-white/60 underline underline-offset-4"
        >
          Play anyway
        </button>
      </div>
    </div>
  );
};

export default RotateHint;
