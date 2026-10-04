"use client";

import { useEffect, useRef } from "react";
import { useSession } from "../contexts/SessionContext";
import { useSettings } from "../settings/settings";
import { primeSfx } from "./sfx";

/**
 * The looping ambient bed.
 *
 * Also synthesised for this project — a detuned A-minor pad with a sparse
 * bell arpeggio over it, crossfaded at the seam so the loop does not click.
 *
 * It only starts once the player presses "Begin exploring", which doubles as
 * the user gesture browsers require before any audio will play at all.
 */
const Ambience = () => {
  const { exploring } = useSession();
  const { masterVolume, muted } = useSettings();
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const element = new Audio("/audio/ambient.mp3");
    element.loop = true;
    element.preload = "auto";
    element.volume = 0;
    audio.current = element;

    return () => {
      element.pause();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;

    // Music sits well under the fountain and the interface.
    const target = muted ? 0 : masterVolume * 0.35;
    element.volume = Math.min(1, target);

    if (!exploring || target <= 0) {
      element.pause();
      return;
    }

    primeSfx();
    void element.play().catch(() => {
      // Still waiting on a user gesture; the next toggle will catch it.
    });
  }, [exploring, masterVolume, muted]);

  return null;
};

export default Ambience;
