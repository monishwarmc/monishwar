"use client";

import { useRapier } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MOVEMENT } from "@/app/constants/controls.constants";
import { AVATAR_BODY } from "@/app/constants/world.constants";

/**
 * The avatar's body in the physics world.
 *
 * Wraps Rapier's kinematic character controller, which is the piece that
 * replaced `controls/obstacles.ts` and the downward raycast the character
 * controller used to do by hand. Hand `move` where the avatar is and where it
 * would like to go, and it answers with where it actually ends up — slid along
 * whatever it hit, stepped over anything low enough, and kept on the ground.
 *
 * ## Which space this works in
 *
 * The avatar's *local* position inside the drifting world group, which is the
 * same space `WorldColliders` places its colliders in. See the note there for
 * why the physics world is that group's local space and not three.js world
 * space. In practice it means the caller passes `character.position` straight
 * in and copies the answer straight back out, with no conversions.
 *
 * Positions are the avatar's root — where the `Monishwar` group sits, which is
 * `MOVEMENT.feetOffset` *below* its feet. The capsule offset is applied here so
 * no caller has to remember it.
 *
 * ## Why a bare collider and no rigid body
 *
 * A kinematic rigid body would be the usual pairing, but a collider attached to
 * one only has its position refreshed from its parent when the world steps. We
 * move the avatar from animation and interaction code that can also teleport it
 * — onto a seat, back to the spawn — so the collider has to be wherever we last
 * put it at the moment we ask the question, not wherever it was at the last
 * step. A parentless collider is positioned directly and stays put.
 */

/**
 * The gap the controller keeps between the capsule and anything it touches.
 *
 * Small, but it must not be zero: it is what stops the solver from having to
 * resolve a contact that is already overlapping by a rounding error.
 */
const SKIN = AVATAR_BODY.radius * 0.05;

/** The steepest ground the avatar will walk up rather than slide down. */
const MAX_SLOPE = THREE.MathUtils.degToRad(50);

/** Below this, a slope is ground; above it, the avatar slides. */
const MIN_SLIDE_SLOPE = THREE.MathUtils.degToRad(35);

/** Steps up to this high are climbed instead of walked into. */
const STEP_HEIGHT = AVATAR_BODY.height * 0.3;

/**
 * How far below the feet the controller looks for ground to stay glued to.
 *
 * This is what stops the avatar bunny-hopping down a slope: without it, walking
 * off any lip launches it on a small ballistic arc.
 */
const SNAP_DISTANCE = AVATAR_BODY.height * 0.2;

/** Distance from the root up to the middle of the capsule. */
const CAPSULE_CENTRE = MOVEMENT.feetOffset + AVATAR_BODY.height / 2;

/**
 * Rapier's own types, read back off the world rather than imported.
 *
 * `@dimforge/rapier3d-compat` is a transitive dependency of
 * `@react-three/rapier`, so it is not resolvable from here — and adding it as
 * a direct dependency would risk ending up with two copies of a WASM module on
 * the next version bump. Deriving the types from the world we are handed keeps
 * them pinned to whatever Rapier `@react-three/rapier` is actually using.
 */
type World = ReturnType<typeof useRapier>["world"];

/**
 * The avatar's own capsule, for queries that must not hit it.
 *
 * Module scope because the camera needs it and the two hooks have no React
 * relationship — the camera is not inside the character controller, it only
 * follows it. One avatar is ever mounted, which is the same assumption the
 * frame-loop scratch space in `CharacterController` makes.
 */
let characterCollider: ReturnType<
  ReturnType<typeof useRapier>["world"]["createCollider"]
> | null = null;

export const getCharacterCollider = () => characterCollider;

type Rig = {
  collider: ReturnType<World["createCollider"]>;
  controller: ReturnType<World["createCharacterController"]>;
};

export const useCharacterBody = () => {
  const { world, rapier } = useRapier();
  const rig = useRef<Rig | null>(null);

  useEffect(() => {
    const collider = world.createCollider(
      rapier.ColliderDesc.capsule(AVATAR_BODY.halfHeight, AVATAR_BODY.radius),
    );

    const controller = world.createCharacterController(SKIN);

    controller.setUp({ x: 0, y: 1, z: 0 });
    controller.setSlideEnabled(true);
    controller.setMaxSlopeClimbAngle(MAX_SLOPE);
    controller.setMinSlopeSlideAngle(MIN_SLIDE_SLOPE);
    controller.enableAutostep(STEP_HEIGHT, AVATAR_BODY.radius * 0.5, false);
    controller.enableSnapToGround(SNAP_DISTANCE);

    rig.current = { collider, controller };
    characterCollider = collider;

    return () => {
      rig.current = null;
      characterCollider = null;
      world.removeCharacterController(controller);
      world.removeCollider(collider, false);
    };
  }, [world, rapier]);

  return useMemo(
    () => ({
      /**
       * Moves the avatar by `step` and writes where it ended up into `out`.
       *
       * Returns Rapier's `computedGrounded()`. **Do not read that as "is on
       * the ground".** Measured against this scene it comes back `true` for
       * the whole of a jump, apex included — about 40% of the avatar's height
       * off the floor. It is useful for deciding whether to keep pressing the
       * capsule into the surface, and for nothing finer than that.
       *
       * To tell whether the avatar actually landed, compare the movement that
       * came back against the movement you asked for: being stopped short of a
       * fall is the floor stopping you. `CharacterController` does exactly
       * that, and the note there explains what went wrong when it did not.
       */
      move: (
        position: THREE.Vector3,
        step: THREE.Vector3,
        out: THREE.Vector3,
        /**
         * Whether to glue the capsule to the floor beneath it.
         *
         * On while walking, which is what stops the avatar bunny-hopping down
         * a slope. Off for the whole of a jump — not just the ascent — or the
         * descent gets pulled onto the ground early and the arc is cut short.
         */
        snapToGround = true,
      ) => {
        const current = rig.current;

        // Before the collider exists there is nothing to collide with, so the
        // move goes through unopposed. This only happens on the first frame or
        // two, and refusing it instead would stall the avatar at the spawn.
        if (!current) {
          out.copy(position).add(step);
          return true;
        }

        const { collider, controller } = current;

        collider.setTranslation({
          x: position.x,
          y: position.y + CAPSULE_CENTRE,
          z: position.z,
        });

        if (snapToGround) controller.enableSnapToGround(SNAP_DISTANCE);
        else controller.disableSnapToGround();

        controller.computeColliderMovement(collider, step);

        const moved = controller.computedMovement();

        out.set(position.x + moved.x, position.y + moved.y, position.z + moved.z);

        return controller.computedGrounded();
      },
    }),
    [],
  );
};
