"use client";

import { ReactNode } from "react";

/**
 * The pictures the guided tour is made of.
 *
 * Every one of them is the gesture being performed, at roughly the size it
 * would be performed at, over the control it belongs to — a thumb circling the
 * stick, a finger sweeping the view, the W key going down. A still diagram of
 * a thumbstick teaches you where the stick is; a thumb moving on it teaches
 * you what to do with it, which is the part people actually get stuck on.
 *
 * Nothing here holds state or listens to anything. The movement is all CSS
 * (see the keyframes at the bottom of globals.css), so these keep animating
 * while the render loop is busy, and `prefers-reduced-motion` stops them
 * without any of these components knowing about it.
 */

/**
 * A pointing hand.
 *
 * Built out of rounded boxes rather than one traced path: it stays crisp at
 * thumb size, and it matches the HUD's own geometry instead of looking like a
 * clip-art hand dropped on top of it. The drop shadow is on the whole shape,
 * so the overlapping boxes read as one silhouette over any background.
 */
const Hand = ({ size = 56 }: { size?: number }) => (
  <svg
    viewBox="0 0 64 88"
    width={size}
    height={(size * 88) / 64}
    className="guide-hand"
    aria-hidden="true"
  >
    <g fill="rgba(255,255,255,0.95)">
      {/* The index finger, out on its own — this is what "point" looks like. */}
      <rect x="26" y="2" width="12" height="42" rx="6" />
      {/* Curled middle and thumb, enough to stop it reading as a lollipop. */}
      <rect x="37" y="24" width="11" height="24" rx="5.5" />
      <rect x="16" y="29" width="11" height="19" rx="5.5" />
      <rect x="15" y="39" width="34" height="42" rx="16" />
    </g>
  </svg>
);

/** The halo that marks where on screen the gesture is happening. */
export const Spotlight = ({ size = 112 }: { size?: number }) => (
  <span
    style={{ width: size, height: size }}
    className="guide-ring absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-300/70 bg-emerald-300/10"
  />
);

/**
 * Positions a demo over a point on screen, out of the way of every pointer.
 *
 * The point is a pair of CSS lengths rather than viewport fractions, because
 * what most of these are aiming at is a HUD control pinned to a corner. A
 * fraction that lands on the jump button at phone size misses it by an inch on
 * a tablet; `calc(100% - 3rem)` is where the button is on both.
 */
export const GestureStage = ({
  x,
  y,
  scale = 1,
  children,
}: {
  x: string;
  y: string;
  /** Keys and mice are drawn at reading size; blow them up to demo size. */
  scale?: number;
  children: ReactNode;
}) => (
  <div
    style={{ left: x, top: y }}
    className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
  >
    <div
      style={{ transform: `scale(${scale})` }}
      className="relative flex items-center justify-center"
    >
      {children}
    </div>
  </div>
);

/* ------------------------------------------------------------------ touch */

/** A thumb pushing a floating stick around its circle. */
export const StickDemo = () => (
  <>
    <span className="h-[120px] w-[120px] rounded-full border-2 border-white/30 bg-black/25" />

    {/* Knob and thumb share one wrapper so they can never drift apart. */}
    <span className="guide-stick absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white/25 backdrop-blur-sm" />
      <span className="absolute left-1/2 top-1/2 translate-x-[-10px] translate-y-[-6px]">
        <Hand size={52} />
      </span>
    </span>
  </>
);

/** A finger dragging across open screen, with the path it is tracing. */
export const SwipeDemo = () => (
  <>
    <svg
      viewBox="0 0 120 40"
      width={150}
      height={50}
      className="absolute"
      aria-hidden="true"
    >
      <path
        d="M14 26 Q60 6 106 26"
        fill="none"
        stroke="rgba(110,231,183,0.85)"
        strokeWidth="3"
        strokeLinecap="round"
        className="guide-trace"
      />
      <path
        d="M100 20 L108 26 L100 32"
        fill="none"
        stroke="rgba(110,231,183,0.85)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    <span className="guide-swipe relative top-3">
      <Hand size={52} />
    </span>
  </>
);

/** A finger tapping a button, with the ripple the tap would leave. */
export const TapDemo = () => (
  <>
    <span className="guide-ripple absolute h-16 w-16 rounded-full border-2 border-emerald-300/90" />
    <span className="guide-tap relative">
      <Hand size={52} />
    </span>
  </>
);

/* ---------------------------------------------------------------- pointer */

const Keycap = ({
  children,
  delay = 0,
  wide = false,
}: {
  children: ReactNode;
  /** Staggers a row so the keys light up in the order you would press them. */
  delay?: number;
  wide?: boolean;
}) => (
  <span
    style={{ animationDelay: `${delay}s` }}
    className={`guide-press flex h-9 items-center justify-center rounded-md border font-mono text-[11px] uppercase ${
      wide ? "w-24" : "w-9"
    }`}
  >
    {children}
  </span>
);

/** WASD, pressed in sequence. */
export const KeypadDemo = () => (
  <span className="flex flex-col items-center gap-1">
    <Keycap delay={0}>W</Keycap>
    <span className="flex gap-1">
      <Keycap delay={0.6}>A</Keycap>
      <Keycap delay={1.2}>S</Keycap>
      <Keycap delay={1.8}>D</Keycap>
    </span>
  </span>
);

/** One key, pressed over and over. */
export const KeyDemo = ({ label }: { label: string }) => (
  <Keycap wide={label.length > 2}>{label}</Keycap>
);

/** A mouse being dragged, for the one control that has no key. */
export const MouseDemo = () => (
  <>
    <svg
      viewBox="0 0 120 44"
      width={150}
      height={55}
      className="absolute"
      aria-hidden="true"
    >
      <path
        d="M16 30 Q60 10 104 30"
        fill="none"
        stroke="rgba(110,231,183,0.85)"
        strokeWidth="3"
        strokeLinecap="round"
        className="guide-trace"
      />
    </svg>

    <span className="guide-swipe relative top-4">
      <svg
        viewBox="0 0 34 50"
        width={30}
        height={44}
        className="guide-hand"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="30"
          height="46"
          rx="15"
          fill="rgba(255,255,255,0.92)"
        />
        {/* The held button, so it reads as a drag and not a hover. */}
        <path
          d="M2 17 V17 A15 15 0 0 1 17 2 V17 Z"
          fill="rgba(16,185,129,0.95)"
        />
        <rect x="15.5" y="9" width="3" height="9" rx="1.5" fill="rgba(0,0,0,0.35)" />
      </svg>
    </span>
  </>
);
