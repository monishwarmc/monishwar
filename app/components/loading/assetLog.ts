"use client";

import { useSyncExternalStore } from "react";
import * as THREE from "three";

/**
 * A record of what loaded, and how long each piece took.
 *
 * three routes every loader through `DefaultLoadingManager`, so hooking its
 * callbacks once gives us per-file timings without touching a single loader
 * call site. drei's `useProgress` reads the same manager, but only reports a
 * percentage and the current URL — this keeps the whole list.
 */
export type AssetState = "loading" | "done" | "failed";

export type Asset = {
  url: string;
  /** Friendly name: the filename, without the path. */
  name: string;
  /** "Model", "Texture", "Audio" — grouped in the UI. */
  kind: string;
  state: AssetState;
  startedAt: number;
  /** Milliseconds, once finished. */
  duration: number;
};

export type LoadSnapshot = {
  /** Only real files; embedded textures are counted but not listed. */
  assets: Asset[];
  /** Everything the loading manager saw, including embedded textures. */
  embedded: number;
  /** Milliseconds from the first request to the last completion. */
  totalMs: number;
  loaded: number;
  total: number;
  done: boolean;
};

const EMPTY: LoadSnapshot = {
  assets: [],
  embedded: 0,
  totalMs: 0,
  loaded: 0,
  total: 0,
  done: false,
};

let snapshot: LoadSnapshot = EMPTY;
const records = new Map<string, Asset>();

let firstStart = 0;
let lastEnd = 0;
let embedded = 0;
let installed = false;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const kindOf = (url: string) => {
  if (/\.(glb|gltf)$/i.test(url)) return "Model";
  if (/\.(hdr|exr|png|jpe?g|webp|ktx2?)$/i.test(url)) return "Texture";
  if (/\.(mp3|ogg|wav)$/i.test(url)) return "Audio";
  if (/\.(ttf|woff2?|json)$/i.test(url)) return "Font";
  return "Asset";
};

const nameOf = (url: string) => {
  try {
    const file = decodeURIComponent(url.split("?")[0].split("/").pop() || url);

    // Models are served from content-hashed URLs, so the raw filename reads
    // "portfolio_world.5315e916.glb". The hash is for the cache, not for the
    // person watching the loading screen.
    return file.replace(/\.[0-9a-f]{8}(\.[^.]+)$/, "$1");
  } catch {
    return url;
  }
};

const publish = () => {
  const assets = [...records.values()].sort(
    (a, b) => a.startedAt - b.startedAt,
  );

  const loaded = assets.filter((a) => a.state !== "loading").length;
  const done = assets.length > 0 && loaded === assets.length;

  snapshot = {
    assets,
    embedded,
    loaded,
    total: assets.length,
    done,
    totalMs: (done ? lastEnd : performance.now()) - firstStart,
  };

  notify();
};

/**
 * Starts recording. Safe to call repeatedly; only the first call hooks in.
 *
 * Called from the loading screen rather than at module scope so it only runs
 * in the browser, and only once something is actually about to load.
 */
export const installAssetLog = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const manager = THREE.DefaultLoadingManager;

  /**
   * GLTFLoader pulls a GLB's embedded textures back through the manager as
   * `blob:` URLs named after a UUID. They are real work, but listing forty of
   * them buries the handful of files a reader can act on, so they only count
   * towards the totals.
   */
  const isInternal = (url: string) =>
    url.startsWith("blob:") || url.startsWith("data:");

  const begin = (url: string) => {
    if (records.has(url)) return;

    const now = performance.now();
    if (!firstStart) firstStart = now;

    records.set(url, {
      url,
      name: nameOf(url),
      kind: kindOf(url),
      state: "loading",
      startedAt: now,
      duration: 0,
    });
  };

  const finish = (url: string, state: AssetState) => {
    const record = records.get(url);
    if (!record || record.state !== "loading") return;

    const now = performance.now();
    lastEnd = now;

    records.set(url, { ...record, state, duration: now - record.startedAt });
  };

  // itemStart/itemEnd are what loaders actually call, once per file, at the
  // moments work begins and ends. The on* callbacks only report completions,
  // which made every duration come out as 0ms.
  const originalStart = manager.itemStart.bind(manager);
  const originalEnd = manager.itemEnd.bind(manager);
  const originalError = manager.itemError.bind(manager);

  manager.itemStart = (url: string) => {
    if (isInternal(url)) embedded += 1;
    else begin(url);

    publish();
    originalStart(url);
  };

  manager.itemEnd = (url: string) => {
    if (!isInternal(url)) finish(url, "done");

    publish();
    originalEnd(url);
  };

  manager.itemError = (url: string) => {
    if (!isInternal(url)) finish(url, "failed");

    publish();
    originalError(url);
  };
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useAssetLog = () =>
  useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
