"use client";

import { RefObject, useEffect } from "react";
import * as THREE from "three";
import { Interactable, registerInteractable } from "./interactables";

/**
 * Register a prop as something the avatar can walk up to and use.
 *
 * Give it the group you rendered, say how close counts and what the prompt
 * should read, and the prompt, the proximity test and the key binding all come
 * for free.
 *
 * Being *solid* is a separate matter and is not handled here: colliders are
 * declared in `physics/WorldColliders`, because they cannot be mounted under
 * the world group that drifts. A prop therefore registers its interaction
 * here and its collider there.
 */
export const useInteractable = ({
  ref,
  id,
  label,
  verb,
  radius,
  onEngage,
  onRelease,
}: {
  ref: RefObject<THREE.Object3D | null>;
  id: string;
  label: string;
  verb: string;
  radius: number;
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

    return unregister;
  }, [ref, id, label, verb, radius, onEngage, onRelease]);
};
