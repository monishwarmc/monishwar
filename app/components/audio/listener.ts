"use client";

import * as THREE from "three";

/**
 * The scene's one set of ears.
 *
 * Shared rather than created per sound because an AudioListener owns a whole
 * AudioContext, and browsers cap how many of those a page may open — a second
 * fountain would have been a second context, not a second sound.
 */
let listener: THREE.AudioListener | null = null;

export const getListener = () => (listener ??= new THREE.AudioListener());

/**
 * How many sounds are currently using the listener.
 *
 * The fountain and the tree both want it on the camera, and both tidy up after
 * themselves. Without counting, whichever unmounted first took the ears away
 * from the other one.
 */
let users = 0;

/** Puts the ears on the camera, and returns the way to take them off again. */
export const attachListener = (camera: THREE.Object3D) => {
  camera.add(getListener());
  users += 1;

  return () => {
    users -= 1;
    if (users === 0 && listener) camera.remove(listener);
  };
};

/**
 * Starts the audio clock.
 *
 * Every browser opens an AudioContext suspended and only lets a user gesture
 * start it, so this is called from the press that enters explore mode. Without
 * it the fountain is connected, playing and completely silent.
 */
export const resumeAudio = () => {
  const context = listener?.context;
  if (!context || context.state !== "suspended") return;

  void context.resume().catch(() => {
    // Still blocked. The next gesture gets another go.
  });
};
