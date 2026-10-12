"use client";

import { useLoader, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useSettings } from "../settings/settings";
import { attachListener, getListener } from "./listener";

/**
 * A sound that plays forever from a point in the world.
 *
 * ## Why this is not drei's <PositionalAudio>
 *
 * The fountain used to stop dead and restart every eighteen seconds. Two
 * things caused that and drei's component can fix neither:
 *
 *   1. A compressed file does not decode to exactly what was encoded. The
 *      encoder pads both ends, and `decodeAudioData` hands that padding back
 *      as silence — so a "gapless" loop still has a hole in it. Trimming it
 *      needs `loopStart`/`loopEnd`, and those have to be set on the buffer
 *      source *before* it starts, which is inside `play()`.
 *   2. The waveform has to meet itself at the seam, which is a property of the
 *      file. `public/audio/fountain.mp3` is now built with a 1.5 second
 *      equal-power crossfade of its tail over its head so that it does.
 *
 * So this owns the whole lifecycle: load, trim, loop, play, and fade the gain
 * rather than cutting it when the volume changes.
 */

/**
 * Trimmed off each end of the loop.
 *
 * Generous enough to cover any decoder's padding (MP3's is ~1100 samples,
 * ~25ms, but nothing guarantees that) and short enough that the crossfade
 * either side of the seam is still doing its job.
 */
const PADDING = 0.035;

/** How quickly the gain follows a volume change, in seconds. */
const FADE = 0.25;

type AmbientLoopProps = {
  url: string;
  /**
   * Distance at which the sound plays at full volume, in world units. It
   * halves roughly every doubling of that distance beyond it.
   */
  refDistance: number;
  /** Multiplier on the master volume. Gain, not a 0-1 fraction. */
  gain?: number;
};

const AmbientLoop = ({ url, refDistance, gain = 1 }: AmbientLoopProps) => {
  const buffer = useLoader(THREE.AudioLoader, url);
  const camera = useThree((state) => state.camera);
  const audioRef = useRef<THREE.PositionalAudio>(null);
  const { masterVolume, muted } = useSettings();

  // The listener rides the camera, so the fountain is quiet from across the
  // deck and loud when the avatar is standing in it.
  useEffect(() => attachListener(camera), [camera]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !buffer) return;

    audio.setBuffer(buffer);
    audio.setRefDistance(refDistance);
    audio.setLoop(true);

    // The whole point: skip the decoder's padding at both ends. Set before
    // play(), because that is where three copies them onto the buffer source
    // and a source's loop points are fixed once it has started.
    audio.setLoopStart(PADDING);
    audio.setLoopEnd(Math.max(PADDING * 2, buffer.duration - PADDING));
    audio.offset = PADDING;

    // Start silent and let the volume effect below fade it in, so entering
    // the page does not open with a wall of water.
    audio.setVolume(0);
    if (!audio.isPlaying) audio.play();

    return () => {
      if (audio.isPlaying) audio.stop();
    };
  }, [buffer, refDistance]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const target = muted ? 0 : masterVolume * gain;

    // `setVolume` ramps too, but over 10ms — fine for a blip, audible as a
    // thud on something this loud. Reaching for the gain node directly is the
    // only way to ask for a slower one.
    audio.gain.gain.setTargetAtTime(target, audio.context.currentTime, FADE);
  }, [masterVolume, muted, gain]);

  return <positionalAudio ref={audioRef} args={[getListener()]} />;
};

export default AmbientLoop;
