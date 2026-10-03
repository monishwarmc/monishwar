"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import { PERSONAL_INFO } from "@/app/constants/portfolio.constants";

const TIPS = [
  "Drag anywhere to orbit the view",
  "Tap auto-run and steer with the camera",
  "Everything is tunable from the settings gear",
  "Press E for the emote wheel",
];

/**
 * True once every GLB and the HDR environment have finished decoding.
 *
 * `useProgress` reads three's shared loading manager, so this can be called
 * from several components without any of them owning the state.
 */
export const useSceneReady = () => {
  const { progress, active } = useProgress();
  return !active && progress >= 100;
};

const LoadingScreen = () => {
  const { progress, item } = useProgress();
  const ready = useSceneReady();

  const [dismissed, setDismissed] = useState(false);
  const [tip, setTip] = useState(0);

  // Hold the finished state briefly so the bar visibly reaches 100 instead of
  // snapping away mid-fill, then fade out.
  useEffect(() => {
    if (!ready) return;

    const timer = window.setTimeout(() => setDismissed(true), 900);
    return () => window.clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setTip((current) => (current + 1) % TIPS.length),
      2600,
    );
    return () => window.clearInterval(timer);
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`pointer-events-auto absolute inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-[#05070a] px-8 transition-opacity duration-700 ${
        ready ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* A slowly orbiting dot around a core — the scene in miniature. */}
      <div className="relative h-24 w-24">
        <span className="absolute inset-0 rounded-full border border-white/15" />
        <span className="absolute inset-3 rounded-full border border-dashed border-white/10" />
        <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-emerald-400/80 blur-[2px]" />
        <span className="absolute inset-0 animate-[spin_3.5s_linear_infinite]">
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
        </span>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {PERSONAL_INFO.name}
        </h1>
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/40 sm:text-xs">
          {PERSONAL_INFO.title}
        </p>
      </div>

      <div className="w-full max-w-sm">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.round(progress))}%` }}
          />
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-4 font-mono text-[11px] text-white/40">
          <span className="truncate">
            {ready ? "ready" : (item?.split("/").pop() ?? "loading assets")}
          </span>
          <span>{Math.min(100, Math.round(progress))}%</span>
        </div>
      </div>

      <p
        key={tip}
        className="animate-[fadeIn_0.5s_ease-out] text-center text-xs text-white/35"
      >
        {TIPS[tip]}
      </p>
    </div>
  );
};

export default LoadingScreen;
