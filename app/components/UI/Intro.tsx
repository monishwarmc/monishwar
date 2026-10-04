"use client";

import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { PERSONAL_INFO } from "@/app/constants/portfolio.constants";
import { useSession } from "../contexts/SessionContext";
import { useIsTouch } from "../hooks/useIsTouch";
import { enterFullscreen } from "./fullscreen";
import { useSceneReady } from "./LoadingScreen";

/**
 * The title card over the idle showcase. It is the only thing on screen before
 * the player takes control, so it carries the introduction as well as the CTA.
 */
const Intro = () => {
  const { exploring, startExploring } = useSession();
  const isTouch = useIsTouch();
  const ready = useSceneReady();

  if (exploring) return null;

  const start = () => {
    startExploring();
    // This press is the user gesture fullscreen and orientation lock need.
    if (isTouch) void enterFullscreen();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-4 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-4xl">
          {PERSONAL_INFO.name}
        </h1>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/70 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-xs">
          {PERSONAL_INFO.title}
        </p>
      </div>

      <button
        type="button"
        onClick={start}
        disabled={!ready}
        className="pointer-events-auto flex touch-none items-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-sm font-semibold tracking-wide text-black shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-40 sm:text-base"
      >
        <SportsEsportsIcon fontSize="small" />
        {ready ? "Begin exploring" : "Preparing world…"}
      </button>

      <p className="text-[11px] text-white/45">
        {isTouch
          ? "Stick to move · drag to look"
          : "WASD to move · drag to look"}
      </p>
    </div>
  );
};

export default Intro;
