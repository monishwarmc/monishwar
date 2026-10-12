"use client";

import { CameraControlsImpl } from "@react-three/drei";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { resetInput } from "../controls/inputState";
import { clearEmote } from "../controls/emoteState";
import { resetInteractions } from "../world/interactables";
import { getSettings } from "../settings/settings";

/** Only one full-screen overlay may be open at a time. */
export type Overlay = "none" | "emotes" | "settings" | "guide";

interface Session {
  /** The spaceship group, so the controller can find the ground mesh in it. */
  spaceshipRef: React.RefObject<THREE.Group>;
  /** The orbit rig, mounted only while the idle showcase is on screen. */
  camRef: React.RefObject<CameraControlsImpl>;
  /** True once the player has taken control of the avatar. */
  exploring: boolean;
  startExploring: () => void;
  stopExploring: () => void;
  overlay: Overlay;
  setOverlay: (overlay: Overlay) => void;
  toggleOverlay: (overlay: Exclude<Overlay, "none">) => void;
}

const SessionContext = createContext<Session | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const spaceshipRef = useRef<THREE.Group>(null!);
  const camRef = useRef<CameraControlsImpl>(null!);

  const [exploring, setExploring] = useState(false);
  const [current, setCurrent] = useState<Overlay>("none");

  /**
   * Opening a panel also stands the avatar up, because an overlay covers the
   * screen and leaving it sitting on the sofa underneath left a live prompt
   * behind the panel.
   *
   * That has to happen *here*, in the handler, and not inside a `setCurrent`
   * updater — which is where it used to live. React is free to call an updater
   * during a render, and `resetInteractions` publishes to an external store, so
   * the store woke `InteractPrompt` up in the middle of rendering this
   * provider. Every route to an overlay goes through this one function so the
   * rule only has to hold in one place.
   */
  const setOverlay = useCallback((next: Overlay) => {
    if (next !== "none") resetInteractions();
    setCurrent(next);
  }, []);

  const toggleOverlay = useCallback(
    (next: Exclude<Overlay, "none">) => {
      setOverlay(current === next ? "none" : next);
    },
    [current, setOverlay],
  );

  const startExploring = useCallback(() => {
    setExploring(true);
    // The guided tour is the first thing a new visitor needs; it is opt-out,
    // and the setting survives a reload.
    setOverlay(getSettings().showHelpOnStart ? "guide" : "none");
  }, [setOverlay]);

  const stopExploring = useCallback(() => {
    setExploring(false);
    setOverlay("none");
    clearEmote();
    // Dropping the HUD mid-press would otherwise leave the stick stuck on.
    resetInput();
  }, [setOverlay]);

  const value = useMemo(
    () => ({
      spaceshipRef,
      camRef,
      exploring,
      startExploring,
      stopExploring,
      overlay: current,
      setOverlay,
      toggleOverlay,
    }),
    [exploring, current, startExploring, stopExploring, setOverlay, toggleOverlay],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = (): Session => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
};
