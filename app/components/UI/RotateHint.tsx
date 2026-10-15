"use client";

import ScreenRotationIcon from "@mui/icons-material/ScreenRotation";
import { useState } from "react";
import { useSession } from "../contexts/SessionContext";
import { useIsTouch } from "../hooks/useIsTouch";
import { useIsPortrait } from "../hooks/useOrientation";

/** A small, dismissible orientation tip. Portrait remains fully playable. */
const RotateHint = () => {
  const { exploring, overlay } = useSession();
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

  if (!exploring || overlay !== "none" || !isTouch || !isPortrait || dismissed) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[max(4.25rem,calc(env(safe-area-inset-top)+4rem))] z-50 flex justify-center px-3">
      <div className="ui-panel pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-white backdrop-blur-xl">
        <ScreenRotationIcon
          style={{ fontSize: 20 }}
          className="shrink-0 text-emerald-200"
        />
        <p className="min-w-0 flex-1 text-xs leading-5 text-white/75">
          Portrait works too. Rotate for a wider view of the world.
        </p>
        <button
          type="button"
          aria-label="Dismiss orientation tip"
          onClick={() => setDismissed(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default RotateHint;
