"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  ControlName,
  MOVEMENT,
  SPAWN,
} from "@/app/constants/controls.constants";
import { SCALE } from "@/app/constants/world.constants";
import { playFootstep, playSfx } from "../audio/sfx";
import { clearEmote, isEmoting } from "../controls/emoteState";
import {
  consumeJump,
  inputState,
  queueJump,
  setAutoRun,
} from "../controls/inputState";
import { resolveObstacles } from "../controls/obstacles";
import { getSeat, isSitting, standUp } from "../controls/sitState";
import { useSession } from "../contexts/SessionContext";
import { ActionName, useMonishwar } from "../contexts/MonishwarContext";
import { release } from "../world/interactables";
import { useSettings } from "../settings/settings";

/* ------------------------------------------------------------- constants */

/** Which clip plays for each way of being on your feet. */
const MOVE_ANIMATION: Record<"idle" | "walk" | "run", ActionName> = {
  idle: "breathing_idle_standing",
  walk: "walking",
  run: "Running",
};

const SIT_ANIMATION: ActionName = "sitting_on_chair";

/**
 * Seconds between footfalls, per gait.
 *
 * Both clips are one in-place gait cycle — two steps — and run at their
 * authored speed whatever the avatar's world speed is, so the cadence belongs
 * to the clip and not to how fast the ground is going past. `walking` is
 * 1.042s long and `Running` 0.667s; halve each for one step.
 */
const STEP_INTERVAL: Record<"walk" | "run", number> = {
  walk: 1.042 / 2,
  run: 0.667 / 2,
};

/**
 * Where in the step the first footfall of a new gait lands.
 *
 * The clips start mid-stride, so starting the timer at zero put the first
 * sound a beat behind the first visible footfall.
 */
const STEP_LEAD_IN = 0.72;

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

/** Half-width of the avatar, used against obstacle circles. */
const BODY_RADIUS = 0.012 * SCALE;

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

/* --------------------------------------------------------------- helpers */

/** Frame-rate independent exponential smoothing. */
const damp = (lambda: number, delta: number) => 1 - Math.exp(-lambda * delta);

/** Shortest signed distance between two angles, in -PI..PI. */
const angleDelta = (from: number, to: number) => {
  const difference = (to - from) % (Math.PI * 2);
  return ((difference + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
};

/* ------------------------------------------------------------- component */

/**
 * Moves the avatar.
 *
 * The frame loop below runs in plain steps, in this order:
 *
 *   1. read input      — keyboard and the touch stick, merged
 *   2. sitting?        — if seated, hold still and skip everything else
 *   3. pick a speed    — walk, sprint or auto-run
 *   4. steer           — relative to where the camera is looking
 *   5. move and block  — obstacles, then the rim of the deck
 *   6. jump and land   — a simple arc, no physics engine
 *   7. stick to ground — a downward ray onto the grass
 *   8. face and animate
 *
 * No physics engine is involved on purpose: the world group is animated every
 * frame (it bobs while idling), and rigid bodies do not follow an animated
 * parent transform. A downward raycast gives the same result here because the
 * whole playfield is one flat disc.
 */
const CharacterController = () => {
  const { spaceshipRef, exploring } = useSession();
  const { ref, animation, setAnimation } = useMonishwar();
  const [subscribeKeys, getKeys] = useKeyboardControls<ControlName>();
  const camera = useThree((state) => state.camera);
  const settings = useSettings();

  /* --- edge-triggered keys ------------------------------------------- */

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

  /* --- mutable state -------------------------------------------------- */

  const velocity = useRef(new THREE.Vector3());
  const airHeight = useRef(0);
  const airVelocity = useRef(0);
  const grounded = useRef(true);
  const moveState = useRef<"idle" | "walk" | "run">("idle");
  const wasSitting = useRef(false);
  const stepTimer = useRef(0);
  const yaw = useRef(0);
  const ground = useRef<THREE.Mesh | null>(null);
  const groundRadius = useRef(0);

  /* --- spawn ----------------------------------------------------------- */

  // Drop the avatar on its mark each time explore mode starts, so the camera
  // always opens on it from the same place rather than wherever the last
  // session left it.
  useEffect(() => {
    if (!exploring) return;

    const character = ref.current;
    if (!character) return;

    character.position.set(SPAWN.x, character.position.y, SPAWN.z);
    character.rotation.y = SPAWN.yaw;

    yaw.current = SPAWN.yaw;
    velocity.current.set(0, 0, 0);
  }, [exploring, ref]);

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

    /* 1. Read input --------------------------------------------------- */

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

    /* 2. Sitting ------------------------------------------------------- */

    const seat = getSeat();

    if (seat) {
      // Any attempt to move gets out of the chair rather than dragging it.
      if (steering) {
        release();
      } else {
        // Park on the seat and hold the pose. The sitting clip raises the
        // hips itself, so the root stays at floor height exactly as it does
        // when standing — hence the same feet offset as the walking path.
        scratch.local.copy(seat.seat);
        scratch.local.y -= MOVEMENT.feetOffset;
        parent.worldToLocal(scratch.local);
        character.position.copy(scratch.local);
        character.rotation.y = seat.facing;

        yaw.current = seat.facing;
        velocity.current.set(0, 0, 0);
        wasSitting.current = true;

        if (animation !== SIT_ANIMATION) setAnimation(SIT_ANIMATION);
        return;
      }
    }

    if (wasSitting.current) {
      // Just stood up: force the idle clip so the sit pose does not stick.
      wasSitting.current = false;
      standUp();
      moveState.current = "idle";
      setAnimation(MOVE_ANIMATION.idle);
    }

    /* 3. Pick a speed -------------------------------------------------- */

    // An emote is a whole-body clip, so the legs are not being animated while
    // it plays. Steering cancels it; until then the avatar is rooted, which is
    // what stops it sliding across the grass in a standing pose.
    if (isEmoting()) {
      if (steering) {
        clearEmote();
      } else {
        velocity.current.set(0, 0, 0);
        inputX = 0;
        inputY = 0;
        inputMagnitude = 0;
      }
    }

    // Taking the stick or the arrow keys normally wins: it drops auto-run and
    // hands the player a walk, which is the slower, more precise speed.
    if (steering && inputState.autoRun && settings.autoRunCancelsOnSteer) {
      setAutoRun(false);
    }

    const autoRunning =
      exploring &&
      inputState.autoRun &&
      !isEmoting() &&
      (!steering || !settings.autoRunCancelsOnSteer);

    if (autoRunning && !steering) {
      // Straight ahead, wherever the camera is now pointing — so orbiting the
      // view is how the player steers while auto-running.
      inputX = 0;
      inputY = 1;
      inputMagnitude = 1;
    }

    const fullTilt = settings.stickFullTiltRuns && inputMagnitude > FULL_TILT;
    const running = autoRunning || fullTilt || (sprintHeld && steering);
    const speed = running ? settings.runSpeed : settings.walkSpeed;

    /* 4. Steer relative to the camera ---------------------------------- */

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

    scratch.target.copy(scratch.move).multiplyScalar(speed);

    const velocityVector = velocity.current;
    velocityVector.lerp(scratch.target, damp(MOVEMENT.acceleration, delta));

    if (velocityVector.lengthSq() < MOVEMENT.idleThreshold ** 2) {
      velocityVector.set(0, 0, 0);
    }

    /* 5. Move, then block ---------------------------------------------- */

    character.getWorldPosition(scratch.position);
    scratch.next.copy(scratch.position).addScaledVector(velocityVector, delta);

    // Slide around anything solid standing on the disc.
    //
    // Nothing is done to the velocity here on purpose. An earlier version cut
    // it to 30% on any contact, which made running past a prop feel like
    // wading. The push-out already removes the component heading into the
    // obstacle; the component sliding along it should survive untouched.
    resolveObstacles(scratch.next, scratch.position.y, BODY_RADIUS);

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

    /* 6. Jump and land -------------------------------------------------- */

    // Draining the queue every frame also discards anything pressed before
    // explore mode started.
    const jumpRequested = consumeJump();

    if (jumpRequested && grounded.current && exploring && !isSitting()) {
      grounded.current = false;
      airVelocity.current = settings.jumpPower;
      playSfx("jump", 0.5);
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

    /* 7. Stick to the ground -------------------------------------------- */

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

    /* 8. Face the way it is going, then pick a clip ---------------------- */

    if (velocityVector.lengthSq() > 1e-8) {
      parent.getWorldQuaternion(scratch.quaternion).invert();

      scratch.move
        .copy(velocityVector)
        .normalize()
        .applyQuaternion(scratch.quaternion);

      const desiredYaw =
        Math.atan2(scratch.move.x, scratch.move.z) + MOVEMENT.modelFacingOffset;

      yaw.current +=
        angleDelta(yaw.current, desiredYaw) * damp(settings.turnRate, delta);

      character.rotation.y = yaw.current;
    }

    // The jump clip owns the avatar until the feet are back down.
    if (!grounded.current) return;

    if (isEmoting()) {
      moveState.current = "idle";
      return;
    }

    const planarSpeed = velocityVector.length();
    const next =
      planarSpeed > settings.runSpeed * MOVEMENT.runAnimationRatio
        ? "run"
        : planarSpeed > MOVEMENT.idleThreshold
          ? "walk"
          : "idle";

    /* 9. Footsteps ------------------------------------------------------ */

    if (justLanded) {
      playFootstep(0.5);
      stepTimer.current = 0;
    } else if (next === "idle") {
      stepTimer.current = 0;
    } else {
      if (next !== moveState.current) {
        stepTimer.current = STEP_INTERVAL[next] * STEP_LEAD_IN;
      }

      stepTimer.current += delta;

      if (stepTimer.current >= STEP_INTERVAL[next]) {
        stepTimer.current -= STEP_INTERVAL[next];
        // A run lands harder than a walk, and that difference is most of what
        // makes the two speeds audible as different things.
        playFootstep(next === "run" ? 0.5 : 0.32);
      }
    }

    // Re-assert whenever the avatar is moving but the mixer is on some other
    // clip — that is what an emote leaves behind when movement cancels it.
    const stale = next !== "idle" && animation !== MOVE_ANIMATION[next];

    if (next !== moveState.current || justLanded || stale) {
      moveState.current = next;
      setAnimation(MOVE_ANIMATION[next]);
    }
  });

  return null;
};

export default CharacterController;
