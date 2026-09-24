"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { Monishwar } from "../../models/Monishwar";
import Ground from "./Ground";
import { useMonishwar } from "../../contexts/MonishwarContext";

const camForward = new THREE.Vector3();
const camRight = new THREE.Vector3();
const moveDirection = new THREE.Vector3();

const UP = new THREE.Vector3(0, 1, 0);

type MovementState = "idle" | "walking" | "running";

export default function Environment() {
  const worldRef = useRef<THREE.Group>(null);

  const { ref: monishwarRef, setAnimation } = useMonishwar();

  const [, getKeys] = useKeyboardControls();

  const movementState = useRef<MovementState>("idle");

  const previousRunKey = useRef(false);

  const previousMovementState = useRef<MovementState>("idle");

  useFrame((state, delta) => {
    if (!monishwarRef.current) return;

    const { forward, backward, left, right, run } = getKeys();

    /*
     * ==========================================
     * MOVEMENT INPUT
     * ==========================================
     */

    const inputX = (right ? 1 : 0) - (left ? 1 : 0);

    const inputZ = (forward ? 1 : 0) - (backward ? 1 : 0);

    const movementKeyPressed = inputX !== 0 || inputZ !== 0;

    /*
     * ==========================================
     * R PRESS
     * ==========================================
     *
     * R is a single press.
     *
     * Press R:
     *      IDLE/WALKING → RUNNING
     */

    const rPressed = run && !previousRunKey.current;

    previousRunKey.current = run;

    if (rPressed) {
      movementState.current = "running";
    }

    /*
     * ==========================================
     * RUNNING → WALKING
     * ==========================================
     *
     * Any movement key cancels running.
     */

    if (movementState.current === "running" && movementKeyPressed) {
      movementState.current = "walking";
    }

    /*
     * ==========================================
     * WALKING
     * ==========================================
     *
     * W/A/S/D work independently.
     *
     * You DON'T need R.
     */

    if (movementState.current === "idle" && movementKeyPressed) {
      movementState.current = "walking";
    }

    /*
     * ==========================================
     * WALKING → IDLE
     * ==========================================
     */

    if (movementState.current === "walking" && !movementKeyPressed) {
      movementState.current = "idle";
    }

    /*
     * ==========================================
     * CAMERA DIRECTION
     * ==========================================
     */

    if (
      movementState.current === "walking" ||
      movementState.current === "running"
    ) {
      /*
       * Get camera forward direction.
       */

      state.camera.getWorldDirection(camForward);

      /*
       * We only want horizontal movement.
       */

      camForward.y = 0;
      camForward.normalize();

      /*
       * ========================================
       * WALKING
       * ========================================
       */

      if (movementState.current === "walking" && movementKeyPressed) {
        /*
         * Camera right.
         */

        camRight.crossVectors(camForward, UP).normalize();

        /*
         * Movement relative to camera.
         */

        moveDirection
          .set(0, 0, 0)
          .addScaledVector(camForward, inputZ)
          .addScaledVector(camRight, inputX)
          .normalize();

        /*
         * Walk speed.
         */

        const walkSpeed = 3;

        monishwarRef.current.position.addScaledVector(
          moveDirection,
          walkSpeed * delta,
        );

        /*
         * Turn character toward
         * movement direction.
         */

        rotateCharacter(monishwarRef.current, moveDirection, delta);
      }

      /*
       * ========================================
       * RUNNING
       * ========================================
       *
       * R starts automatic running.
       *
       * No W required.
       */

      if (movementState.current === "running") {
        /*
         * Run in camera's horizontal direction.
         */

        moveDirection.copy(camForward);

        /*
         * Run speed.
         */

        const runSpeed = 9;

        monishwarRef.current.position.addScaledVector(
          moveDirection,
          runSpeed * delta,
        );

        /*
         * Character follows camera direction.
         */

        rotateCharacter(monishwarRef.current, moveDirection, delta);
      }
    }

    /*
     * ==========================================
     * ANIMATION
     * ==========================================
     */

    const currentState = movementState.current;

    if (currentState !== previousMovementState.current) {
      switch (currentState) {
        case "idle":
          setAnimation("breathing_idle_standing");
          break;

        case "walking":
          setAnimation("walking");
          break;

        case "running":
          setAnimation("Running");
          break;
      }

      previousMovementState.current = currentState;
    }
  });

  return (
    <group ref={worldRef}>
      <Ground />

      <Monishwar position={[0, -0.87, 0]} />

      <ambientLight intensity={2} />
    </group>
  );
}

/*
 * ==========================================
 * CHARACTER ROTATION
 * ==========================================
 */

function rotateCharacter(
  character: THREE.Group,
  direction: THREE.Vector3,
  delta: number,
) {
  const targetRotation = Math.atan2(direction.x, direction.z);

  let angleDifference = targetRotation - character.rotation.y;

  /*
   * Normalize angle to [-PI, PI].
   */

  angleDifference = Math.atan2(
    Math.sin(angleDifference),
    Math.cos(angleDifference),
  );

  /*
   * Smooth rotation.
   */

  const turnSpeed = 1 - Math.exp(-12 * delta);

  character.rotation.y += angleDifference * turnSpeed;
}
