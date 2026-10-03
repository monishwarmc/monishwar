"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ControlName, MOVEMENT } from "@/app/constants/controls.constants";
import {
  consumeJump,
  inputState,
  queueJump,
  setAutoRun,
} from "../controls/inputState";
import { useSession } from "../contexts/SessionContext";
import { ActionName, useMonishwar } from "../contexts/MonishwarContext";
import { useSettings } from "../settings/settings";

type MoveState = "idle" | "walk" | "run";

const MOVE_ANIMATION: Record<MoveState, ActionName> = {
  idle: "breathing_idle_standing",
  walk: "walking",
  run: "Running",
};

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

/** Stick tilt past which "full tilt runs" kicks in. */
const FULL_TILT = 0.85;

/**
 * Per-frame scratch space. Module scope rather than `useMemo` because only one
 * controller is ever mounted, and allocating vectors inside the render loop is
 * what makes three.js apps stutter on phones.
 */
const scratch = {
  forward: new THREE.Vector3(),
  right: new THREE.Vector3(),
  move: new THREE.Vector3(),
  target: new THREE.Vector3(),
  position: new THREE.Vector3(),
  next: new THREE.Vector3(),
  origin: new THREE.Vector3(),
  center: new THREE.Vector3(),
  scale: new THREE.Vector3(),
  local: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  raycaster: new THREE.Raycaster(),
};

scratch.raycaster.far = 1;

/** Frame-rate independent exponential smoothing. */
const dampFactor = (lambda: number, delta: number) =>
  1 - Math.exp(-lambda * delta);

/** Shortest signed distance between two angles, in -PI..PI. */
const angleDelta = (from: number, to: number) => {
  const difference = (to - from) % (Math.PI * 2);
  return ((difference + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
};

/**
 * Drives the avatar from whichever input is live — keyboard on pointer
 * devices, the touch HUD on phones — and keeps it standing on the grass disc.
 *
 * No physics engine is involved on purpose: the world group is animated every
 * frame (it bobs while idling), and rigid bodies do not follow an animated
 * parent transform. A downward raycast against the ground mesh gives the same
 * result here because the whole playfield is one flat disc.
 */
const CharacterController = () => {
  const { spaceshipRef, exploring } = useSession();
  const { ref, setAnimation } = useMonishwar();
  const [subscribeKeys, getKeys] = useKeyboardControls<ControlName>();
  const camera = useThree((state) => state.camera);
  const settings = useSettings();

  // Jump and auto-run both toggle on the key's rising edge rather than being
  // sampled in the frame loop: a quick tap can fall entirely between two
  // frames on a slow device, and a dropped input is the most obvious bug.
  useEffect(
    () =>
      subscribeKeys(
        (state) => state.jump,
        (pressed) => {
          if (pressed) queueJump();
        },
      ),
    [subscribeKeys],
  );

  useEffect(
    () =>
      subscribeKeys(
        (state) => state.autoRun,
        (pressed) => {
          if (pressed) setAutoRun(!inputState.autoRun);
        },
      ),
    [subscribeKeys],
  );

  const velocity = useRef(new THREE.Vector3());
  const airHeight = useRef(0);
  const airVelocity = useRef(0);
  const grounded = useRef(true);
  const moveState = useRef<MoveState>("idle");
  const yaw = useRef(0);
  const ground = useRef<THREE.Mesh | null>(null);
  const groundRadius = useRef(0);

  /** Caches the grass mesh and its usable radius once the GLB is in the graph. */
  const resolveGround = () => {
    if (ground.current) return ground.current;

    const spaceship = spaceshipRef?.current;
    if (!spaceship) return null;

    const mesh = spaceship.getObjectByName("ground");
    if (!(mesh instanceof THREE.Mesh)) return null;

    mesh.geometry.computeBoundingSphere();

    const boundingRadius = mesh.geometry.boundingSphere?.radius ?? 0;
    const worldScale = mesh.getWorldScale(scratch.scale);

    ground.current = mesh;
    groundRadius.current = boundingRadius * worldScale.x * MOVEMENT.edgeMargin;

    return mesh;
  };

  useFrame((_, rawDelta) => {
    const character = ref.current;
    const parent = character?.parent;
    if (!character || !parent) return;

    // A backgrounded tab resumes with a huge delta; clamp so nobody teleports.
    const delta = Math.min(rawDelta, 0.1);

    const groundMesh = resolveGround();
    if (!groundMesh) return;

    const keys = getKeys();

    let inputX = 0;
    let inputY = 0;
    let sprintHeld = false;

    if (exploring) {
      inputX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + inputState.moveX;
      inputY =
        (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0) + inputState.moveY;
      sprintHeld = keys.run;
    }

    let inputMagnitude = Math.min(Math.hypot(inputX, inputY), 1);
    const steering = inputMagnitude > 1e-4;

    // Taking the stick or the arrow keys normally wins: it drops auto-run and
    // hands the player a walk, which is the slower, more precise speed. The
    // setting lets anyone who prefers it keep the pace while steering.
    if (steering && inputState.autoRun && settings.autoRunCancelsOnSteer) {
      setAutoRun(false);
    }

    const autoRunning =
      exploring && inputState.autoRun && (!steering || !settings.autoRunCancelsOnSteer);

    if (autoRunning && !steering) {
      // Straight ahead, wherever the camera is now pointing — so orbiting the
      // view is how the player steers while auto-running.
      inputX = 0;
      inputY = 1;
      inputMagnitude = 1;
    }

    const fullTilt =
      settings.stickFullTiltRuns && inputMagnitude > FULL_TILT;

    const running =
      autoRunning || fullTilt || (sprintHeld && steering);

    // Movement is relative to where the camera is looking, flattened to the disc.
    camera.getWorldDirection(scratch.forward);
    scratch.forward.setY(0);

    if (scratch.forward.lengthSq() < 1e-8) scratch.forward.set(0, 0, 1);

    scratch.forward.normalize();
    scratch.right.crossVectors(scratch.forward, UP).normalize();

    scratch.move
      .copy(scratch.forward)
      .multiplyScalar(inputY)
      .addScaledVector(scratch.right, inputX);

    if (scratch.move.lengthSq() > 1e-8) {
      scratch.move.normalize().multiplyScalar(inputMagnitude);
    }

    const speed = running ? settings.runSpeed : settings.walkSpeed;

    scratch.target.copy(scratch.move).multiplyScalar(speed);

    const velocityVector = velocity.current;

    velocityVector.lerp(
      scratch.target,
      dampFactor(MOVEMENT.acceleration, delta),
    );

    if (velocityVector.lengthSq() < MOVEMENT.idleThreshold ** 2) {
      velocityVector.set(0, 0, 0);
    }

    character.getWorldPosition(scratch.position);
    scratch.next.copy(scratch.position).addScaledVector(velocityVector, delta);

    // Keep the avatar on the grass rather than walking off into the glass.
    groundMesh.getWorldPosition(scratch.center);

    const offsetX = scratch.next.x - scratch.center.x;
    const offsetZ = scratch.next.z - scratch.center.z;
    const distance = Math.hypot(offsetX, offsetZ);
    const radius = groundRadius.current;

    if (radius > 0 && distance > radius) {
      const clamp = radius / distance;

      scratch.next.setX(scratch.center.x + offsetX * clamp);
      scratch.next.setZ(scratch.center.z + offsetZ * clamp);
      velocityVector.multiplyScalar(0.2);
    }

    // Jump — only from the floor, so it cannot be spammed mid-air. Draining
    // the queue every frame also discards anything pressed before explore mode.
    const jumpRequested = consumeJump();

    if (jumpRequested && grounded.current && exploring) {
      grounded.current = false;
      airVelocity.current = settings.jumpPower;
      setAnimation("Jumping");
    }

    let justLanded = false;

    if (!grounded.current) {
      airVelocity.current -= MOVEMENT.gravity * delta;
      airHeight.current += airVelocity.current * delta;

      if (airHeight.current <= 0) {
        airHeight.current = 0;
        airVelocity.current = 0;
        grounded.current = true;
        justLanded = true;
      }
    }

    // Drop onto the terrain from just above the current head height.
    scratch.origin.set(scratch.next.x, scratch.next.y + 0.3, scratch.next.z);
    scratch.raycaster.set(scratch.origin, DOWN);

    const [hit] = scratch.raycaster.intersectObject(groundMesh, false);

    if (hit) {
      scratch.next.setY(hit.point.y - MOVEMENT.feetOffset + airHeight.current);
    } else {
      // Off the edge of the collider: refuse the horizontal step.
      scratch.next.setX(scratch.position.x);
      scratch.next.setZ(scratch.position.z);
      velocityVector.set(0, 0, 0);
    }

    scratch.local.copy(scratch.next);
    parent.worldToLocal(scratch.local);
    character.position.copy(scratch.local);

    // Face the direction of travel, expressed in the parent's frame.
    if (velocityVector.lengthSq() > 1e-8) {
      parent.getWorldQuaternion(scratch.quaternion).invert();

      scratch.move
        .copy(velocityVector)
        .normalize()
        .applyQuaternion(scratch.quaternion);

      const desiredYaw =
        Math.atan2(scratch.move.x, scratch.move.z) + MOVEMENT.modelFacingOffset;

      yaw.current +=
        angleDelta(yaw.current, desiredYaw) *
        dampFactor(settings.turnRate, delta);

      character.rotation.y = yaw.current;
    }

    // Animation: the jump clip owns the avatar until the feet are back down.
    if (!grounded.current) return;

    const planarSpeed = velocityVector.length();
    const next: MoveState =
      planarSpeed > settings.runSpeed * MOVEMENT.runAnimationRatio
        ? "run"
        : planarSpeed > MOVEMENT.idleThreshold
          ? "walk"
          : "idle";

    if (next !== moveState.current || justLanded) {
      moveState.current = next;
      setAnimation(MOVE_ANIMATION[next]);
    }
  });

  return null;
};

export default CharacterController;
