"use client";

import { useSyncExternalStore } from "react";
import * as THREE from "three";

/**
 * Things in the world the avatar can walk up to and use.
 *
 * This is the seam for everything you add later. Drop a GLB in the scene, call
 * `registerInteractable` with where it is and what pressing the key should do,
 * and the prompt, the proximity test and the key binding all come for free.
 *
 *   useInteractable({
 *     id: "sofa",
 *     object: groupRef,
 *     radius: 0.2,
 *     label: "Sofa",
 *     verb: "Sit",
 *     onEngage: () => …,
 *     onRelease: () => …,
 *   });
 */
export type Interactable = {
  id: string;
  /** Read every frame, so it may sit under an animated parent. */
  object: THREE.Object3D;
  /** How close the avatar must be, in world units. */
  radius: number;
  /** Shown in the prompt, e.g. "Sofa". */
  label: string;
  /** Shown before the label, e.g. "Sit". */
  verb: string;
  /** Called when the player engages. Return false to refuse. */
  onEngage?: () => boolean | void;
  /** Called when they disengage, walk away, or leave explore mode. */
  onRelease?: () => void;
};

const registry = new Map<string, Interactable>();

export const registerInteractable = (item: Interactable) => {
  registry.set(item.id, item);
  return () => {
    registry.delete(item.id);
  };
};

export const getInteractable = (id: string) => registry.get(id);
export const allInteractables = () => registry;

/* ------------------------------------------------------------------ state */

type Snapshot = {
  /** Closest interactable in range, if any. */
  nearest: string | null;
  /** The one currently being used (sitting on the sofa, reading a board). */
  engaged: string | null;
  /**
   * *Every* interactable in range, not just the winner.
   *
   * `nearest` is a competition, and some things need to know they are being
   * stood at without having to win it. The keynote stage is the case that
   * forced this: the sofa is parked in front of it deliberately, to watch the
   * screen from — but sitting down made the sofa the nearest interactable, so
   * the stage decided nobody was there and unmounted the site. You sat down
   * to watch it and it switched off.
   */
  inRange: readonly string[];
};

const NONE: readonly string[] = [];

let snapshot: Snapshot = { nearest: null, engaged: null, inRange: NONE };
const SERVER: Snapshot = { nearest: null, engaged: null, inRange: NONE };

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getInteractionState = () => snapshot;

export const setNearest = (nearest: string | null) => {
  if (snapshot.nearest === nearest) return;
  snapshot = { ...snapshot, nearest };
  notify();
};

/** Publishes who is in range. Order-insensitive, so it only wakes on change. */
export const setInRange = (ids: readonly string[]) => {
  const next = [...ids].sort();
  const current = snapshot.inRange;

  if (
    next.length === current.length &&
    next.every((id, i) => id === current[i])
  ) {
    return;
  }

  snapshot = { ...snapshot, inRange: next };
  notify();
};

export const release = () => {
  if (!snapshot.engaged) return;

  registry.get(snapshot.engaged)?.onRelease?.();
  snapshot = { ...snapshot, engaged: null };
  notify();
};

const engage = (id: string) => {
  if (snapshot.engaged === id) return;

  release();

  const item = registry.get(id);
  if (!item) return;

  // An interactable may refuse — the sofa does if the avatar is mid-jump.
  if (item.onEngage?.() === false) return;

  snapshot = { ...snapshot, engaged: id };
  notify();
};

/** The interact key: use what is in front of you, or stop using it. */
export const toggleNearest = () => {
  if (snapshot.engaged) release();
  else if (snapshot.nearest) engage(snapshot.nearest);
};

export const resetInteractions = () => {
  release();
  setNearest(null);
  setInRange(NONE);
};

export const useInteractionState = () =>
  useSyncExternalStore(subscribe, getInteractionState, () => SERVER);
