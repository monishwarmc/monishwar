"use client";

import { useCallback, useRef } from "react";
import * as THREE from "three";
import {
  AVATAR_SIT,
  GROUND_Y,
  metres,
  SOFA_FACING,
  SOFA_POSITION,
} from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import { sitDown, standUp } from "../../controls/sitState";
import { Sofa } from "../../models/Sofa";
import { useInteractable } from "../useInteractable";

/**
 * A sofa on the deck that the avatar can actually sit on.
 *
 * Walk up, press the interact key, and the controller parks the avatar in
 * front of the cushion and plays the sitting clip. Walking (or pressing
 * again) stands back up.
 *
 * The sofa is sized in `world.constants` against the sitting clip itself, so
 * the cushion arrives at the height the animation expects. All that is left
 * here is to stand the avatar in the right spot: the clip slides the hips
 * backwards as it sits, so the root has to start that far in *front* of the
 * cushion for the hips to land on it.
 *
 * Where it stands, and the collider that makes it solid, are both in
 * `world.constants` and `physics/WorldColliders` respectively.
 */

/** The sofa's own origin is the middle of the cushion; the seat is forward. */
const SEAT_OFFSET = new THREE.Vector3(0, 0, metres(AVATAR_SIT.hipsBehindRoot));

const SofaSpot = () => {
  const group = useRef<THREE.Group>(null);

  const onEngage = useCallback(() => {
    const object = group.current;
    if (!object) return false;

    // The sitting clip keeps the avatar's root on the floor and raises the
    // hips itself, so the seat is a spot on the ground, not the cushion.
    const seat = object.localToWorld(SEAT_OFFSET.clone());
    seat.y = GROUND_Y;

    playSfx("open", 0.5);
    return sitDown({ seat, facing: SOFA_FACING });
  }, []);

  const onRelease = useCallback(() => {
    playSfx("close", 0.4);
    standUp();
  }, []);

  useInteractable({
    ref: group,
    id: "sofa",
    label: "Sofa",
    verb: "Sit",
    radius: metres(2.6),
    onEngage,
    onRelease,
  });

  return (
    <group
      position={[SOFA_POSITION[0], GROUND_Y, SOFA_POSITION[2]]}
      rotation={[0, SOFA_FACING, 0]}
      ref={group}
    >
      <Sofa />
    </group>
  );
};

export default SofaSpot;
