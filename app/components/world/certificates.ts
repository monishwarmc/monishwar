"use client";

import { useSyncExternalStore } from "react";
import { CERTIFICATIONS } from "@/app/constants/portfolio.constants";

/**
 * WHICH CERTIFICATE IS ON SHOW.
 *
 * One number — the index into `CERTIFICATIONS` — shared by everything that
 * cares: the carousel out on the deck, the arrows the player drives it with,
 * and the fruit on the skill tree, which lands on a certificate by asking this
 * to focus it.
 *
 * It is a plain module store with `useSyncExternalStore` over the top, the
 * same shape as `interactables.ts`, for the same reason: the carousel advances
 * on a timer and is read from inside the frame loop, and neither of those
 * wants a React render to be the mechanism.
 */

export type CertificateFocus = {
  index: number;
  /**
   * True when the player (or a falling fruit) took control, which stops the
   * carousel advancing on its own. Walking away hands it back.
   */
  held: boolean;
  /** Set when something wants the certificate shown full size, in 2D. */
  opened: boolean;
};

const COUNT = CERTIFICATIONS.length;

let snapshot: CertificateFocus = { index: 0, held: false, opened: false };
const SERVER: CertificateFocus = { index: 0, held: false, opened: false };

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getCertificateFocus = () => snapshot;

const set = (next: Partial<CertificateFocus>) => {
  const merged = { ...snapshot, ...next };

  if (
    merged.index === snapshot.index &&
    merged.held === snapshot.held &&
    merged.opened === snapshot.opened
  ) {
    return;
  }

  snapshot = merged;
  notify();
};

/** Wraps, so the carousel is a ring rather than a list with two dead ends. */
const wrap = (index: number) => ((index % COUNT) + COUNT) % COUNT;

/** Used by the auto-advance timer. Does not count as the player taking hold. */
export const advance = () => set({ index: wrap(snapshot.index + 1) });

/** The arrows, and the A/D keys while standing at the carousel. */
export const step = (direction: 1 | -1) =>
  set({ index: wrap(snapshot.index + direction), held: true });

export const showCertificate = (index: number) =>
  set({ index: wrap(index), held: true });

/**
 * Put a named certificate on screen, full size.
 *
 * This is where a fallen fruit ends up: it knows the certificate for its
 * skill, and "take me to it" means both turning the carousel to it out on the
 * deck and opening it big enough to actually read.
 */
export const openCertificate = (name: string) => {
  const index = CERTIFICATIONS.findIndex((item) => item.name === name);
  if (index < 0) return false;

  set({ index, held: true, opened: true });
  return true;
};

export const closeCertificate = () => set({ opened: false });

/** Hands the carousel back to its timer — called when the player walks off. */
export const releaseCertificates = () => set({ held: false, opened: false });

export const useCertificateFocus = () =>
  useSyncExternalStore(subscribe, getCertificateFocus, () => SERVER);
