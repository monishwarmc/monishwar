"use client";

import { useCallback, useRef } from "react";
import * as THREE from "three";
import {
  AVATAR_SIT,
  GROUND_Y,
  metres,
  SOFA_FIT,
  SOFA_MODEL,
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
 */

/** Where the sofa stands on the deck. */
const POSITION: [number, number, number] = [0.52, 0, 0.38];
/** Turned to face the fountain at the centre of the deck. */
const FACING = Math.atan2(-POSITION[0], -POSITION[2]);

/** The sofa's own origin is the middle of the cushion; the seat is forward. */
const SEAT_OFFSET = new THREE.Vector3(0, 0, metres(AVATAR_SIT.hipsBehindRoot));

/** Half the sofa's width once fitted, which is what the avatar bumps into. */
const HALF_WIDTH = metres(SOFA_MODEL.halfWidth * SOFA_FIT);

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
    return sitDown({ seat, facing: FACING });
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
    // Just the body of the sofa. Any wider and the collider shoves the avatar
    // away from the one spot it has to reach to sit down.
    collision: HALF_WIDTH * 0.8,
    onEngage,
    onRelease,
  });

  return (
    <group position={[POSITION[0], GROUND_Y, POSITION[2]]} rotation={[0, FACING, 0]} ref={group}>
      <Sofa />
    </group>
  );
};

export default SofaSpot;
