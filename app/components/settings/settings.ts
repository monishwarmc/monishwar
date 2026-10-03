"use client";

import { useSyncExternalStore } from "react";
import {
  Bindings,
  ControlName,
  FOLLOW_CAMERA,
  MOVEMENT,
  createDefaultBindings,
} from "@/app/constants/controls.constants";

export type Quality = "low" | "balanced" | "high";

export type Settings = {
  // --- Camera ---
  lookSensitivity: number;
  invertLookX: boolean;
  invertLookY: boolean;
  cameraDistance: number;
  cameraHeight: number;
  fieldOfView: number;
  /** Multiplier on the follow damping. Below 1 is floatier, above is snappier. */
  cameraSmoothing: number;

  // --- Movement ---
  walkSpeed: number;
  runSpeed: number;
  turnRate: number;
  jumpPower: number;
  /** When off, grabbing the stick steers without cancelling auto-run. */
  autoRunCancelsOnSteer: boolean;
  /** Pushing the stick past ~85% runs, the way Free Fire's stick does. */
  stickFullTiltRuns: boolean;

  // --- HUD ---
  mirrorHud: boolean;
  floatingStick: boolean;
  stickScale: number;
  hudOpacity: number;
  showKeyHints: boolean;
  showCompass: boolean;
  hapticFeedback: boolean;

  // --- Display ---
  quality: Quality;
  showBackground: boolean;

  // --- Keys ---
  bindings: Bindings;
};

export const QUALITY_PIXEL_RATIO: Record<Quality, number> = {
  low: 1,
  balanced: 1.5,
  high: 2,
};

export const DEFAULT_SETTINGS: Settings = {
  lookSensitivity: 1,
  invertLookX: false,
  invertLookY: false,
  cameraDistance: FOLLOW_CAMERA.distance,
  cameraHeight: FOLLOW_CAMERA.lookHeight,
  fieldOfView: FOLLOW_CAMERA.fieldOfView,
  cameraSmoothing: 1,

  walkSpeed: MOVEMENT.walkSpeed,
  runSpeed: MOVEMENT.runSpeed,
  turnRate: MOVEMENT.turnRate,
  jumpPower: MOVEMENT.jumpVelocity,
  autoRunCancelsOnSteer: true,
  stickFullTiltRuns: false,

  mirrorHud: false,
  floatingStick: true,
  stickScale: 1,
  hudOpacity: 1,
  showKeyHints: true,
  showCompass: true,
  hapticFeedback: true,

  quality: "balanced",
  showBackground: true,

  bindings: createDefaultBindings(),
};

const STORAGE_KEY = "portfolio.settings.v1";

/**
 * Settings live in a module-level store read through `useSyncExternalStore`
 * rather than React context.
 *
 * Two reasons: the render loop reads them every frame without needing a
 * context bridge into the canvas, and `getServerSnapshot` lets the server
 * render the defaults while the browser hydrates from localStorage — no
 * mismatch, and no setState inside an effect.
 */
let snapshot: Settings = DEFAULT_SETTINGS;
let hydrated = false;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Keeps stored settings usable after a field is added or renamed. */
const merge = (stored: Partial<Settings>): Settings => ({
  ...DEFAULT_SETTINGS,
  ...stored,
  bindings: { ...DEFAULT_SETTINGS.bindings, ...(stored.bindings ?? {}) },
});

const read = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? merge(JSON.parse(raw) as Partial<Settings>) : DEFAULT_SETTINGS;
  } catch {
    // Private mode, blocked storage, corrupt JSON — defaults are fine.
    return DEFAULT_SETTINGS;
  }
};

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Nothing to do; the session still works, it just will not be remembered.
  }
};

export const subscribeSettings = (listener: () => void) => {
  // First subscription happens after mount, which is the earliest point where
  // touching localStorage cannot desynchronise hydration.
  if (!hydrated) {
    hydrated = true;

    const stored = read();

    if (stored !== snapshot) {
      snapshot = stored;
      queueMicrotask(notify);
    }
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getSettings = () => snapshot;
const getDefaults = () => DEFAULT_SETTINGS;

export const updateSettings = (patch: Partial<Settings>) => {
  snapshot = { ...snapshot, ...patch };
  persist();
  notify();
};

export const setBinding = (name: ControlName, keys: string[]) => {
  updateSettings({ bindings: { ...snapshot.bindings, [name]: keys } });
};

export const resetSettings = () => {
  snapshot = { ...DEFAULT_SETTINGS, bindings: createDefaultBindings() };
  persist();
  notify();
};

export const useSettings = () =>
  useSyncExternalStore(subscribeSettings, getSettings, getDefaults);

/** Short vibration on HUD presses, when the device and the setting allow it. */
export const tapFeedback = () => {
  if (!snapshot.hapticFeedback) return;

  try {
    navigator.vibrate?.(12);
  } catch {
    // Unsupported or blocked by a permissions policy.
  }
};
