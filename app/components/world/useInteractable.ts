"use client";

import { RefObject, useEffect } from "react";
import * as THREE from "three";
import { registerObstacle } from "../controls/obstacles";
import { Interactable, registerInteractable } from "./interactables";

/**
 * Register a prop as something the avatar can walk up to and use.
 *
 * This is the one call a new piece of scenery needs. Give it the group you
 * rendered, say how close counts and what the prompt should read, and
 * optionally how wide it is so the avatar cannot walk through it.
 */
export const useInteractable = ({
  ref,
  id,
  label,
  verb,
  radius,
  /** Omit to make the prop walk-through. */
  collision,
  onEngage,
  onRelease,
}: {
  ref: RefObject<THREE.Object3D | null>;
  id: string;
  label: string;
  verb: string;
  radius: number;
  collision?: number;
  onEngage?: Interactable["onEngage"];
  onRelease?: Interactable["onRelease"];
}) => {
  useEffect(() => {
    const object = ref.current;
    if (!object) return;

    const unregister = registerInteractable({
      id,
      object,
      radius,
      label,
      verb,
      onEngage,
      onRelease,
    });

    const unblock = collision
      ? registerObstacle(`prop:${id}`, { object, radius: collision })
      : undefined;

    return () => {
      unregister();
      unblock?.();
    };
  }, [ref, id, label, verb, radius, collision, onEngage, onRelease]);
};
