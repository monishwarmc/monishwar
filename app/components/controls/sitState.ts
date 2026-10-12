"use client";

import * as THREE from "three";

/**
 * Whether the avatar is sitting, and where.
 *
 * Kept next to the other input state rather than in React: the character
 * controller reads it every frame, and a seat change is a once-in-a-while
 * event that nothing needs to re-render for.
 */
export type Seat = {
  /** World position of the cushion. */
  seat: THREE.Vector3;
  /** Which way the avatar should face while sitting, in radians. */
  facing: number;
};

let seated: Seat | null = null;

/**
 * Takes a seat, and says whether it was taken.
 *
 * Nothing refuses yet, but the boolean is the channel `engage` reads to let an
 * interactable turn a player down — so a seat that should not be usable
 * mid-jump has somewhere to say so.
 */
export const sitDown = (next: Seat) => {
  seated = next;
  return true;
};

export const standUp = () => {
  seated = null;
};

export const getSeat = () => seated;
export const isSitting = () => seated !== null;
