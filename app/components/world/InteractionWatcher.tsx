"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ControlName } from "@/app/constants/controls.constants";
import { playSfx } from "../audio/sfx";
import { useSession } from "../contexts/SessionContext";
import { useMonishwar } from "../contexts/MonishwarContext";
import {
  allInteractables,
  getInteractionState,
  resetInteractions,
  setInRange,
  setNearest,
  toggleNearest,
} from "./interactables";

/**
 * Finds the closest thing the avatar could use, and binds the interact key.
 *
 * One loop for every prop rather than one loop each: with a handful of
 * interactables this is cheaper and, more importantly, it is the only place
 * that decides *which* prop wins when two are in range.
 */
const InteractionWatcher = () => {
  const [subscribeKeys] = useKeyboardControls<ControlName>();
  const { exploring, overlay } = useSession();
  const { ref: avatar } = useMonishwar();

  const scratch = useMemo(
    () => ({ prop: new THREE.Vector3(), player: new THREE.Vector3() }),
    [],
  );

  useEffect(
    () =>
      subscribeKeys(
        (state) => state.interact,
        (pressed) => {
          if (pressed) toggleNearest();
        },
      ),
    [subscribeKeys],
  );

  useEffect(() => {
    if (!exploring) resetInteractions();
  }, [exploring]);

  useFrame(() => {
    const player = avatar.current;
    if (!player || !exploring) return;

    // An overlay already cleared the interaction state on the way up (see
    // SessionContext). Without this the loop would put it straight back the
    // next frame, which left a live prompt behind the panel, re-played the
    // arrival chime, and — once the control board started opening the guide —
    // let the tour restart itself from step one while it was already open.
    if (overlay !== "none") return;

    player.getWorldPosition(scratch.player);

    let bestId: string | null = null;
    let bestDistance = Infinity;
    const within: string[] = [];

    for (const item of allInteractables().values()) {
      item.object.getWorldPosition(scratch.prop);

      const distance = Math.hypot(
        scratch.player.x - scratch.prop.x,
        scratch.player.z - scratch.prop.z,
      );

      if (distance >= item.radius) continue;

      within.push(item.id);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = item.id;
      }
    }

    setInRange(within);

    const { nearest, engaged } = getInteractionState();

    if (bestId !== nearest) {
      // A soft chime on arrival is the only cue that something is usable here.
      if (bestId && !engaged) playSfx("chime", 0.35);
      setNearest(bestId);
    }
  });

  return null;
};

export default InteractionWatcher;
