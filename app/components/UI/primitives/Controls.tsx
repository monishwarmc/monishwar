"use client";

import { ReactNode } from "react";
import { tapFeedback } from "../../settings/settings";

/**
 * Shared chrome for the HUD and the settings panel.
 *
 * Every control is sized for a thumb first (44px minimum target). The trigger
 * matters more than it looks:
 *
 * - `press` fires on pointerdown, the way a game pad does, so jumping and
 *   sprinting feel immediate instead of waiting for click resolution.
 * - `click` fires at the end of the tap, and is required for anything that
 *   opens a panel. A touch tap is pointerdown → pointerup → click; if the
 *   panel mounts on pointerdown, the click that finishes the *same* tap lands
 *   on whatever the panel just put under the finger — which closed the
 *   settings panel the instant it opened.
 */

export const HudButton = ({
  label,
  caption,
  size,
  active,
  opacity = 1,
  trigger = "press",
  onPress,
  children,
}: {
  label: string;
  /** Word shown under the button, so nothing rests on reading the picture. */
  caption?: string;
  size: number;
  active?: boolean;
  opacity?: number;
  trigger?: "press" | "click";
  onPress: () => void;
  children: ReactNode;
}) => (
  <span
    style={{ opacity }}
    className="pointer-events-none flex flex-col items-center gap-0.5"
  >
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    onPointerDown={
      trigger === "press"
        ? (event) => {
            event.preventDefault();
            tapFeedback();
            onPress();
          }
        : undefined
    }
    onClick={
      trigger === "click"
        ? () => {
            tapFeedback();
            onPress();
          }
        : undefined
    }
    style={{ height: size, width: size }}
    className={`pointer-events-auto flex shrink-0 touch-none items-center justify-center overflow-hidden rounded-full border backdrop-blur-[2px] transition-transform duration-150 active:scale-90 ${
      active
        ? "border-emerald-300 bg-emerald-400/30 text-emerald-50 ring-2 ring-emerald-300/50"
        : "border-white/60 bg-black/30 text-white"
    }`}
  >
    {children}
  </button>
    {caption && (
      <span className="text-[9px] font-semibold uppercase tracking-wide text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        {caption}
      </span>
    )}
  </span>
);

export const Slider = ({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) => (
  <label className="flex flex-col gap-1.5 py-2">
    <span className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-white/85">{label}</span>
      <span className="font-mono text-xs text-emerald-300">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-6 w-full cursor-pointer touch-auto accent-emerald-400"
    />
  </label>
);

export const Toggle = ({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={() => {
      tapFeedback();
      onChange(!value);
    }}
    className="flex w-full items-center justify-between gap-4 py-2.5 text-left"
  >
    <span className="flex min-w-0 flex-col">
      <span className="text-sm text-white/85">{label}</span>
      {hint && <span className="text-xs text-white/45">{hint}</span>}
    </span>
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        value ? "bg-emerald-400/80" : "bg-white/20"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200 ${
          value ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </span>
  </button>
);

export const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) => (
  <div className="flex flex-col gap-2 py-2">
    <span className="text-sm text-white/85">{label}</span>
    <div className="flex gap-1 rounded-xl bg-white/10 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            tapFeedback();
            onChange(option.value);
          }}
          className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
            option.value === value
              ? "bg-emerald-400/90 text-black"
              : "text-white/70 hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

export const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="border-t border-white/10 py-2 first:border-t-0">
    <h3 className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
      {title}
    </h3>
    {children}
  </section>
);

export const DangerButton = ({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) => (
  <button
    type="button"
    onClick={() => {
      tapFeedback();
      onPress();
    }}
    className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/85 transition-colors hover:border-white/40 hover:bg-white/10 active:scale-[0.98]"
  >
    {label}
  </button>
);
