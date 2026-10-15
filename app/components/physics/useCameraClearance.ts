"use client";

import { useRapier } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { AVATAR_BODY } from "@/app/constants/world.constants";
import { getCharacterCollider } from "./useCharacterBody";

/**
 * How far the camera may pull back before something gets in the way.
 *
 * The deck used to be a lawn with a fountain on it, and a follow camera that
 * ignored the world was fine. It is now a lawn with four large exhibits on it,
 * and pulling the camera back far enough puts the lens inside a wall — you end
 * up looking at the inside of a slab, or through it at nothing.
 *
 * So the camera asks the physics world the same kind of question the avatar
 * does: *I would like to be back there; how far can I actually get?*
 *
 * ## Why a ray and not a shape cast
 *
 * A sphere cast would be more correct — it would keep the near plane clear of
 * a wall the ray happens to pass beside. But this runs every frame for the
 * whole session, the near plane is 0.01 against a deck 1.7 across, and the
 * margin below covers the difference. A ray is the cheaper question and the
 * answer is good enough.
 *
 * ## Which space this works in
 *
 * Same as everything else physical here: the drifting world group's local
 * space. The camera lives in three.js world space, and the two are only the
 * same once the intro drift has settled — which is exactly when this is used,
 * because `FollowCamera` is mounted only in explore mode. See the note in
 * `WorldColliders` for why the physics world is that space at all.
 */

/** Kept between the lens and whatever it found, so the near plane is clear. */
const MARGIN = AVATAR_BODY.radius * 1.5;

export const useCameraClearance = () => {
  const { world, rapier } = useRapier();

  const scratch = useRef({
    origin: new THREE.Vector3(),
    direction: new THREE.Vector3(),
  });

  return useMemo(
    () => ({
      /**
       * Returns how far from `from` the camera may sit along the line to `to`.
       *
       * Never more than the distance actually asked for, and never negative —
       * a camera shoved behind its own target is worse than one in a wall.
       */
      clear: (from: THREE.Vector3, to: THREE.Vector3) => {
        const { origin, direction } = scratch.current;

        direction.copy(to).sub(from);

        const wanted = direction.length();
        if (wanted < 1e-6) return wanted;

        direction.divideScalar(wanted);
        origin.copy(from);

        const ray = new rapier.Ray(origin, direction);

        /*
         * The avatar's own capsule has to be excluded, or this never works.
         *
         * The ray starts at the camera's aim point, which is the avatar's
         * shoulders — 0.060 up a capsule that is 0.122 tall, so the origin is
         * *inside* it. With `solid` true that reports a time-of-impact of
         * zero, the clearance comes back as nothing, and the camera is pinned
         * to the back of the avatar's head for the whole session.
         *
         * `solid` stays true for everything else: a ray that starts inside a
         * wall should report the wall, not pass through and find the next one.
         */
        const hit = world.castRay(
          ray,
          wanted,
          true,
          undefined,
          undefined,
          getCharacterCollider() ?? undefined,
        );

        if (!hit) return wanted;

        return Math.max(0, Math.min(wanted, hit.timeOfImpact - MARGIN));
      },
    }),
    [world, rapier],
  );
};
