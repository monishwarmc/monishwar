"use client";

import { KeyboardControls, KeyboardControlsEntry } from "@react-three/drei";
import { ReactNode, useMemo } from "react";
import { useSettings } from "../settings/settings";

/**
 * Client boundary for drei's `KeyboardControls`, built from the player's own
 * bindings. r3f bridges React context into the canvas, so both the scene and
 * the DOM overlay can call `useKeyboardControls` from under here.
 *
 * drei keys its internal store on the map contents, so rebinding a key in the
 * settings panel rebuilds the store and every subscriber re-attaches.
 */
const KeyboardProvider = ({ children }: { children: ReactNode }) => {
  const { bindings } = useSettings();

  const map = useMemo<KeyboardControlsEntry[]>(
    () =>
      Object.entries(bindings).map(([name, keys]) => ({
        name,
        keys: [...keys],
      })),
    [bindings],
  );

  return <KeyboardControls map={map}>{children}</KeyboardControls>;
};

export default KeyboardProvider;
