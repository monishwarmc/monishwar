"use client";

import { useEffect, useRef } from "react";
import { subscribeHeading } from "../controls/heading";
import { useSettings } from "../settings/settings";

const MARKS = [
  { label: "N", angle: 0 },
  { label: "NE", angle: 45 },
  { label: "E", angle: 90 },
  { label: "SE", angle: 135 },
  { label: "S", angle: 180 },
  { label: "SW", angle: 225 },
  { label: "W", angle: 270 },
  { label: "NW", angle: 315 },
];

/** Pixels of strip per degree of heading. */
const PIXELS_PER_DEGREE = 2.2;

/**
 * A heading strip, the way a shooter shows one.
 *
 * The strip is rendered three times side by side so it can scroll past either
 * end without a seam, and it is positioned straight from a frame-loop callback
 * rather than React state — moving a strip 60 times a second through a render
 * would cost more than the whole compass is worth.
 */
const Compass = () => {
  const { showCompass, hudOpacity } = useSettings();
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCompass) return;

    return subscribeHeading((radians) => {
      const strip = stripRef.current;
      if (!strip) return;

      const degrees = ((radians * 180) / Math.PI + 360) % 360;
      strip.style.transform = `translateX(${-degrees * PIXELS_PER_DEGREE}px)`;
    });
  }, [showCompass]);

  if (!showCompass) return null;

  return (
    <div
      style={{ opacity: hudOpacity }}
      className="pointer-events-none absolute left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-20 hidden h-7 w-44 -translate-x-1/2 overflow-hidden rounded-full border border-white/15 bg-black/40 backdrop-blur-sm sm:block"
    >
      {/* Centre tick: the direction the camera is facing. */}
      <span className="absolute left-1/2 top-0 z-10 h-full w-px -translate-x-1/2 bg-emerald-300/90" />

      <div className="absolute left-1/2 top-0 h-full">
        <div ref={stripRef} className="relative h-full">
          {[-360, 0, 360].map((offset) =>
            MARKS.map(({ label, angle }) => (
              <span
                key={`${offset}-${label}`}
                style={{ left: (angle + offset) * PIXELS_PER_DEGREE }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] tracking-wider text-white/70"
              >
                {label}
              </span>
            )),
          )}
        </div>
      </div>

      <span className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/70 to-transparent" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/70 to-transparent" />
    </div>
  );
};

export default Compass;
