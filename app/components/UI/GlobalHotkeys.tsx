"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useEffect } from "react";
import { ControlName } from "@/app/constants/controls.constants";
import { useSession } from "../contexts/SessionContext";
import { focusZone, getZoneState } from "../world/zoneState";
import { toggleFullscreen } from "./fullscreen";

/**
 * Keyboard shortcuts for the overlays.
 *
 * These go through the same rebindable map as movement, so the settings panel
 * can retune them, and they are edge-triggered: a held key must not strobe a
 * panel open and shut. The exit button is deliberately absent from the HUD, so
 * this is the keyboard route back out.
 */
const GlobalHotkeys = () => {
  const [subscribeKeys] = useKeyboardControls<ControlName>();
  const { exploring, stopExploring, toggleOverlay, overlay, setOverlay } =
    useSession();

  useEffect(
    () =>
      subscribeKeys(
        (state) => state.settings,
        (pressed) => {
          if (pressed) toggleOverlay("settings");
        },
      ),
    [subscribeKeys, toggleOverlay],
  );

  useEffect(
    () =>
      subscribeKeys(
        (state) => state.emote,
        (pressed) => {
          if (pressed && exploring) toggleOverlay("emotes");
        },
      ),
    [subscribeKeys, toggleOverlay, exploring],
  );

  useEffect(
    () =>
      subscribeKeys(
        (state) => state.fullscreen,
        (pressed) => {
          if (pressed) toggleFullscreen();
        },
      ),
    [subscribeKeys],
  );

  useEffect(
    () =>
      subscribeKeys(
        (state) => state.exit,
        (pressed) => {
          if (!pressed) return;

          // Back out one layer at a time. Reading a station is the
          // innermost layer and is not part of `overlay`, so it is checked
          // first — otherwise Escape at a station quit explore mode outright.
          if (getZoneState().focused) focusZone(null);
          else if (overlay !== "none") setOverlay("none");
          else if (exploring) stopExploring();
        },
      ),
    [subscribeKeys, overlay, setOverlay, exploring, stopExploring],
  );

  return null;
};

export default GlobalHotkeys;
