"use client";

import { getSettings, tapFeedback } from "../settings/settings";

/**
 * Short interface and world sounds.
 *
 * Every clip in /public/audio was synthesised for this project (sine pads,
 * decaying blips and band-passed noise written out with numpy), so there is no
 * licence attached to any of it.
 *
 * Browsers refuse to play audio until the page has been interacted with, so
 * nothing here throws on failure — a blocked sound is not worth an error.
 */
export type SfxName =
  | "click"
  | "open"
  | "close"
  | "chime"
  | "jump"
  | "step1"
  | "step2"
  | "step3"
  | "step4";

const SOURCES: Record<SfxName, string> = {
  click: "/audio/click.mp3",
  open: "/audio/open.mp3",
  close: "/audio/close.mp3",
  chime: "/audio/chime.mp3",
  jump: "/audio/jump.mp3",
  step1: "/audio/step1.mp3",
  step2: "/audio/step2.mp3",
  step3: "/audio/step3.mp3",
  step4: "/audio/step4.mp3",
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

export const playSfx = (name: SfxName, gain = 1, rate = 1) => {
  if (typeof window === "undefined") return;

  const { masterVolume, muted } = getSettings();
  if (muted || masterVolume <= 0) return;

  try {
    const pool = poolFor(name);
    const index = (cursors.get(name) ?? 0) % POOL_SIZE;
    cursors.set(name, index + 1);

    const audio = pool[index];
    audio.currentTime = 0;
    audio.playbackRate = rate;
    audio.volume = Math.min(1, masterVolume * gain);
    void audio.play().catch(() => {
      // Autoplay policy, or the file is still loading. Silence is fine.
    });
  } catch {
    // No audio device, or the element was torn down. Not worth surfacing.
  }
};

/**
 * The whole feedback for a HUD press: a click under the finger and a tick of
 * haptics where the device has them.
 *
 * It lives here rather than in settings so there is one thing to call from a
 * button, and so a screen reader's focus-then-activate still only makes one
 * sound.
 */
export const press = () => {
  playSfx("click", 0.45);
  tapFeedback();
};

const FOOTSTEPS: SfxName[] = ["step1", "step2", "step3", "step4"];

/** The clip used last, so the same one is never heard twice in a row. */
let lastStep = -1;

/**
 * One footstep on grass.
 *
 * Four recordings, shuffled and pitched slightly either way, because a single
 * clip repeating at walking pace is the most obviously synthetic sound a game
 * can make — the ear locks onto the repetition within about three steps.
 */
export const playFootstep = (gain = 1) => {
  let index = Math.floor(Math.random() * FOOTSTEPS.length);
  if (index === lastStep) index = (index + 1) % FOOTSTEPS.length;
  lastStep = index;

  playSfx(FOOTSTEPS[index], gain, 0.9 + Math.random() * 0.25);
};

/** Warm the pools after the first gesture so the first click is not late. */
export const primeSfx = () => {
  if (typeof window === "undefined") return;
  (Object.keys(SOURCES) as SfxName[]).forEach(poolFor);
};
