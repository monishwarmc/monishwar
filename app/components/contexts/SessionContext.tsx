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

/** Only one full-screen overlay may be open at a time. */
export type Overlay = "none" | "emotes" | "settings";

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
  const [overlay, setOverlay] = useState<Overlay>("none");

  const startExploring = useCallback(() => {
    setExploring(true);
    setOverlay("none");
  }, []);

  const stopExploring = useCallback(() => {
    setExploring(false);
    setOverlay("none");
    // Dropping the HUD mid-press would otherwise leave the stick stuck on.
    resetInput();
  }, []);

  const toggleOverlay = useCallback((next: Exclude<Overlay, "none">) => {
    setOverlay((current) => (current === next ? "none" : next));
  }, []);

  const value = useMemo(
    () => ({
      spaceshipRef,
      camRef,
      exploring,
      startExploring,
      stopExploring,
      overlay,
      setOverlay,
      toggleOverlay,
    }),
    [exploring, overlay, startExploring, stopExploring, toggleOverlay],
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
