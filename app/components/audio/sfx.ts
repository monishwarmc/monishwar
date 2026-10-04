"use client";

import { getSettings } from "../settings/settings";

/**
 * Short interface sounds.
 *
 * Every clip in /public/audio was synthesised for this project (sine pads and
 * decaying blips written out with numpy), so there is no licence attached to
 * any of it.
 *
 * Browsers refuse to play audio until the page has been interacted with, so
 * nothing here throws on failure — a blocked sound is not worth an error.
 */
export type SfxName = "click" | "open" | "close" | "chime" | "jump";

const SOURCES: Record<SfxName, string> = {
  click: "/audio/click.mp3",
  open: "/audio/open.mp3",
  close: "/audio/close.mp3",
  chime: "/audio/chime.mp3",
  jump: "/audio/jump.mp3",
};

/**
 * A small pool per sound. One <audio> element cannot overlap with itself, and
 * rapid clicks would otherwise cut each other off.
 */
const POOL_SIZE = 3;
const pools = new Map<SfxName, HTMLAudioElement[]>();
const cursors = new Map<SfxName, number>();

const poolFor = (name: SfxName) => {
  let pool = pools.get(name);
  if (pool) return pool;

  pool = Array.from({ length: POOL_SIZE }, () => {
    const audio = new Audio(SOURCES[name]);
    audio.preload = "auto";
    return audio;
  });

  pools.set(name, pool);
  cursors.set(name, 0);
  return pool;
};

export const playSfx = (name: SfxName, gain = 1) => {
  if (typeof window === "undefined") return;

  const { masterVolume, muted } = getSettings();
  if (muted || masterVolume <= 0) return;

  try {
    const pool = poolFor(name);
    const index = (cursors.get(name) ?? 0) % POOL_SIZE;
    cursors.set(name, index + 1);

    const audio = pool[index];
    audio.currentTime = 0;
    audio.volume = Math.min(1, masterVolume * gain);
    void audio.play().catch(() => {
      // Autoplay policy, or the file is still loading. Silence is fine.
    });
  } catch {
    // No audio device, or the element was torn down. Not worth surfacing.
  }
};

/** Warm the pools after the first gesture so the first click is not late. */
export const primeSfx = () => {
  if (typeof window === "undefined") return;
  (Object.keys(SOURCES) as SfxName[]).forEach(poolFor);
};
