"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import { PERSONAL_INFO } from "@/app/constants/portfolio.constants";
import { useAssetLog } from "../loading/assetLog";
import { startLoading } from "../loading/assets";

/**
 * True once every model, texture and sound has finished decoding.
 *
 * `useProgress` reads three's shared loading manager, so this can be called
 * from several components without any of them owning the state.
 */
export const useSceneReady = () => {
  const { progress, active } = useProgress();
  return !active && progress >= 100;
};

const ms = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;

/** A tiny bar showing how long one asset took against the slowest one. */
const Bar = ({ fraction, state }: { fraction: number; state: string }) => (
  <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/10">
    <span
      className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${
        state === "failed"
          ? "bg-red-400"
          : state === "loading"
            ? "animate-pulse bg-sky-400/70"
            : "bg-emerald-400"
      }`}
      style={{ width: `${Math.max(3, fraction * 100)}%` }}
    />
  </span>
);

/**
 * The loading screen.
 *
 * It shows the work rather than a spinner: every file, what kind it is,
 * whether it is still going, and how long it took — with the slowest one
 * obvious at a glance, because that is the one worth compressing.
 */
const LoadingScreen = () => {
  const { progress } = useProgress();
  const ready = useSceneReady();
  const log = useAssetLog();

  const [dismissed, setDismissed] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Install the log, then start fetching. This order is the whole point: a
  // model that begins loading first never shows up in the manifest.
  useEffect(() => startLoading(), []);

  // A live clock while it works, so a slow connection still feels responsive.
  useEffect(() => {
    if (ready) return;

    const started = performance.now();
    const timer = window.setInterval(
      () => setElapsed(performance.now() - started),
      100,
    );

    return () => window.clearInterval(timer);
  }, [ready]);

  // Hold the finished state briefly so the bar visibly reaches 100 instead of
  // snapping away mid-fill, then fade out.
  useEffect(() => {
    if (!ready) return;

    const timer = window.setTimeout(() => setDismissed(true), 1100);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (dismissed) return null;

  const pct = Math.min(100, Math.round(progress));
  const slowest = Math.max(1, ...log.assets.map((a) => a.duration));
  const heaviest = log.assets.reduce<(typeof log.assets)[number] | null>(
    (worst, asset) => (!worst || asset.duration > worst.duration ? asset : worst),
    null,
  );

  return (
    <div
      className={`pointer-events-auto absolute inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-[#05070a] px-6 py-8 transition-opacity duration-700 ${
        ready ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* A dot orbiting a core — the scene in miniature. */}
      <div className="relative h-20 w-20 shrink-0">
        <span className="absolute inset-0 rounded-full border border-white/15" />
        <span className="absolute inset-3 rounded-full border border-dashed border-white/10" />
        <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-emerald-400/80 blur-[2px]" />
        <span className="absolute inset-0 animate-[spin_3.5s_linear_infinite]">
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
        </span>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {PERSONAL_INFO.name}
        </h1>
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/40">
          {PERSONAL_INFO.title}
        </p>
      </div>

      {/* Overall progress */}
      <div className="w-full max-w-md shrink-0">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-baseline justify-between font-mono text-[11px] text-white/45">
          <span>
            {ready
              ? `ready in ${ms(log.totalMs || elapsed)}`
              : `${ms(elapsed)} elapsed`}
          </span>
          <span>
            {log.loaded}/{log.total || "…"} files
            {log.embedded > 0 && ` · ${log.embedded} embedded`} · {pct}%
          </span>
        </div>
      </div>

      {/* The manifest. Capped and scrollable so a long list cannot push the
          totals off the bottom of the screen. */}
      <ul className="w-full max-w-md space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "34vh" }}>
        {log.assets.map((asset) => (
          <li key={asset.url} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
              <span className="flex min-w-0 items-baseline gap-2">
                <span
                  className={
                    asset.state === "failed"
                      ? "text-red-400"
                      : asset.state === "loading"
                        ? "text-sky-300"
                        : "text-emerald-400"
                  }
                >
                  {asset.state === "failed"
                    ? "×"
                    : asset.state === "loading"
                      ? "•"
                      : "✓"}
                </span>
                <span className="truncate text-white/70">{asset.name}</span>
                <span className="shrink-0 text-white/25">{asset.kind}</span>
              </span>

              <span className="shrink-0 text-white/40">
                {asset.state === "loading" ? "…" : ms(asset.duration)}
              </span>
            </div>

            <Bar fraction={asset.duration / slowest} state={asset.state} />
          </li>
        ))}

        {log.assets.length === 0 && (
          <li className="text-center font-mono text-[11px] text-white/30">
            opening the manifest…
          </li>
        )}
      </ul>

      {heaviest && heaviest.duration > 0 && (
        <p className="shrink-0 text-center font-mono text-[11px] text-white/35">
          slowest so far: {heaviest.name} ({ms(heaviest.duration)})
        </p>
      )}
    </div>
  );
};

export default LoadingScreen;
