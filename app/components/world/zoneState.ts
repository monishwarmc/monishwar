"use client";

import { useSyncExternalStore } from "react";
import * as THREE from "three";
import { ZoneId } from "./zones";

/**
 * Which station the avatar is standing at, and which one the camera is reading.
 *
 * There is no DOM panel any more — everything a station has to say is built in
 * 3D on the station itself. "Focusing" therefore means moving the camera to a
 * comfortable reading position in front of that station's board, not opening
 * an overlay on top of the scene.
 *
 * The frame loop writes `nearest` every frame but only notifies on change,
 * which is the point of keeping it out of React state: walking across the deck
 * must not re-render the overlay sixty times a second.
 */
type ZoneSnapshot = {
  nearest: ZoneId | null;
  focused: ZoneId | null;
};

let snapshot: ZoneSnapshot = { nearest: null, focused: null };

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => snapshot;
const SERVER: ZoneSnapshot = { nearest: null, focused: null };
const getServerSnapshot = () => SERVER;

export const setNearestZone = (nearest: ZoneId | null) => {
  if (snapshot.nearest === nearest) return;
  snapshot = { ...snapshot, nearest };
  notify();
};

export const focusZone = (focused: ZoneId | null) => {
  if (snapshot.focused === focused) return;
  snapshot = { ...snapshot, focused };
  notify();
};

/** The interact key: read the station in front of you, or step back from it. */
export const toggleNearestZone = () => {
  if (snapshot.focused) return focusZone(null);
  if (snapshot.nearest) focusZone(snapshot.nearest);
};

export const getZoneState = () => snapshot;

export const resetZones = () => {
  if (!snapshot.nearest && !snapshot.focused) return;
  snapshot = { nearest: null, focused: null };
  notify();
};

export const useZoneState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/* ------------------------------------------------------------------ focus */

/**
 * Where the camera should sit to read a given station.
 *
 * Positions are in the station's own space, so a station only has to say
 * "stand here, look there" relative to its own board and the maths to get to
 * world space is the station's transform.
 */
export type FocusAnchor = {
  object: THREE.Object3D;
  camera: THREE.Vector3;
  target: THREE.Vector3;
};

const anchors = new Map<ZoneId, FocusAnchor>();

export const registerFocusAnchor = (id: ZoneId, anchor: FocusAnchor) => {
  anchors.set(id, anchor);
  return () => {
    anchors.delete(id);
  };
};

export const getFocusAnchor = (id: ZoneId) => anchors.get(id);
