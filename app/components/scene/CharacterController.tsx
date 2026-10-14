"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import {
  ControlName,
  MOVEMENT,
  SPAWN,
} from "@/app/constants/controls.constants";
import { AVATAR_BODY, DECK } from "@/app/constants/world.constants";
import { playFootstep, playSfx } from "../audio/sfx";
import { clearEmote, isEmoting } from "../controls/emoteState";
import {
  consumeJump,
  inputState,
  queueJump,
  setAutoRun,
} from "../controls/inputState";
import { getSeat, isSitting, standUp } from "../controls/sitState";
import { useCharacterBody } from "../physics/useCharacterBody";
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

/** Stick tilt past which "full tilt runs" kicks in. */
const FULL_TILT = 0.85;

/**
 * Where the avatar's root sits when it is standing on the grass.
 *
 * Its own inner group is `feetOffset` above it, so the root has to be that far
 * under the surface for the feet to be on it.
 */
const STANDING_Y = DECK.surfaceY - MOVEMENT.feetOffset;

/**
 * Downward speed held while grounded.
 *
 * A kinematic character controller only reports itself grounded if it is being
 * pushed *into* the floor, so a character that asks for exactly zero vertical
 * movement floats a hair above the surface and reports itself airborne every
 * other frame. A constant nudge downwards is the standard fix; the controller
 * clamps it at the surface, so it costs nothing.
 */
const GROUND_BIAS = MOVEMENT.gravity * 0.5;

/**
 * How far below the deck counts as having fallen out of the world.
 *
 * Nothing should ever get here — the rim wall is twice the avatar's height and
 * the floor collider is wider than the wall it stands inside. It is a way back
 * from an unrecoverable state rather than a situation that is expected.
 */
const VOID_Y = DECK.surfaceY - AVATAR_BODY.height * 4;

/**
 * How much less than it asked for the avatar may fall and still be considered
 * falling freely.
 *
 * Only has to clear floating-point noise in the controller's answer; anything
 * the floor actually stops is short by far more than this.
 */
const LANDING_SLACK = AVATAR_BODY.radius * 0.01;

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
  step: new THREE.Vector3(),
  next: new THREE.Vector3(),
  local: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
};

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
 *   5. jump and fall   — an impulse, then gravity
 *   6. move            — handed to Rapier, which answers with where it got to
 *   7. face and animate
 *
 * ## What this used to do, and what Rapier does instead
 *
 * Steps 5 and 6 were three separate pieces of hand-written geometry: a loop
 * that pushed the avatar out of a registry of obstacle circles, a clamp that
 * held it inside the radius of the grass disc, and a downward raycast onto the
 * grass mesh to find the floor. They are all gone. `useCharacterBody` asks
 * Rapier's kinematic character controller the one question that matters — "I
 * would like to move by this much; where do I actually end up?" — and it
 * answers with sliding, step-up and ground snapping already applied.
 *
 * The old comment here said no physics engine was involved because the world
 * group is animated every frame and rigid bodies do not follow an animated
 * parent. That constraint is real and it is still respected: the physics world
 * *is* that group's local space, so the drift never enters the simulation. See
 * `physics/WorldColliders`.
 */
const CharacterController = () => {
  const { exploring } = useSession();
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

  const body = useCharacterBody();

  const velocity = useRef(new THREE.Vector3());
  /** Vertical speed. Positive is upward; a jump sets it and gravity eats it. */
  const rise = useRef(0);
  /** True from the moment a jump starts until the avatar is back on a surface. */
  const airborne = useRef(false);
  const grounded = useRef(true);
  const moveState = useRef<"idle" | "walk" | "run">("idle");
  const wasSitting = useRef(false);
  const stepTimer = useRef(0);
  const yaw = useRef(0);

  /* --- spawn ----------------------------------------------------------- */

  /** Puts the avatar back on its mark, standing on the grass. */
  const spawn = useCallback(
    (character: THREE.Object3D) => {
      character.position.set(SPAWN.x, STANDING_Y, SPAWN.z);
      character.rotation.y = SPAWN.yaw;

      yaw.current = SPAWN.yaw;
      rise.current = 0;
      airborne.current = false;
      grounded.current = true;
      velocity.current.set(0, 0, 0);
    },
    [],
  );

  // Drop the avatar on its mark each time explore mode starts, so the camera
  // always opens on it from the same place rather than wherever the last
  // session left it.
  useEffect(() => {
    if (!exploring) return;

    const character = ref.current;
    if (character) spawn(character);
  }, [exploring, ref, spawn]);

  useFrame((_, rawDelta) => {
    const character = ref.current;
    const parent = character?.parent;
    if (!character || !parent) return;

    // A backgrounded tab resumes with a huge delta; clamp so nobody teleports.
    const delta = Math.min(rawDelta, 0.1);

    // Before anyone has taken control the avatar just stands on its mark. The
    // physics world is paused during the intro, so there is nothing to ask;
    // and because the avatar is a child of the drifting world group, parking
    // it in local space is what keeps it planted on the grass while the whole
    // scene bobs underneath the orbit camera.
    if (!exploring) {
      character.position.set(SPAWN.x, STANDING_Y, SPAWN.z);
      return;
    }

    /* 1. Read input --------------------------------------------------- */

    const keys = getKeys();

    let inputX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + inputState.moveX;
    let inputY =
      (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0) + inputState.moveY;

    const sprintHeld = keys.run;

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

    /* 5. Jump and fall --------------------------------------------------- */

    // Draining the queue every frame also discards anything pressed before
    // explore mode started.
    const jumpRequested = consumeJump();
    const wasGrounded = grounded.current;
    const previousY = character.position.y;

    // `airborne` is the jump's own state, and it is deliberately not the same
    // thing as "Rapier says we are not grounded".
    //
    // Rapier reports this character grounded for the *whole* of a jump —
    // traced frame by frame, apex included, around 40% of the avatar's height
    // clear of the floor. An earlier version keyed the vertical path off that
    // flag, so the frame after a jump started took the grounded branch,
    // overwrote the upward speed with the downward bias, and pulled the avatar
    // back to the grass. The jump lasted exactly one frame: invisible standing
    // still, a twitch while running.
    if (jumpRequested && wasGrounded && !airborne.current && !isSitting()) {
      rise.current = settings.jumpPower;
      airborne.current = true;
      playSfx("jump", 0.5);
      setAnimation("Jumping");
    } else if (airborne.current) {
      // A jump owns the vertical axis from here until it lands.
      rise.current -= MOVEMENT.gravity * delta;
    } else if (wasGrounded) {
      rise.current = -GROUND_BIAS;
    } else {
      // Walked off an edge rather than jumped off one.
      rise.current -= MOVEMENT.gravity * delta;
    }

    /* 6. Move -------------------------------------------------------------- */

    // One question to Rapier, which answers with the movement that survived
    // contact: slid along whatever it hit, stepped over anything low enough,
    // and kept on the ground on the way down.
    //
    // Note that `character.position` goes in and comes back out untranslated.
    // The physics world is this group's local space, so no conversion is
    // needed in either direction — see physics/WorldColliders.
    const requestedY = rise.current * delta;

    scratch.step.set(
      velocityVector.x * delta,
      requestedY,
      velocityVector.z * delta,
    );

    // Snapping stays off for the whole jump. It reaches further than a single
    // frame of the arc, so leaving it on re-attaches the avatar to the grass
    // on the way down and the jump ends halfway through.
    grounded.current = body.move(
      character.position,
      scratch.step,
      scratch.next,
      !airborne.current,
    );

    if (scratch.next.y < VOID_Y) {
      spawn(character);
      return;
    }

    character.position.copy(scratch.next);

    /*
     * Landing is read from the movement Rapier actually allowed, not from its
     * grounded flag — see the note above `airborne`. If the avatar asked to
     * fall and was stopped short of it, the floor is what stopped it.
     */
    const descending = rise.current < 0;
    const stoppedShort =
      scratch.next.y - previousY > requestedY + LANDING_SLACK;

    let justLanded = false;

    if (airborne.current) {
      if (descending && stoppedShort) {
        airborne.current = false;
        rise.current = 0;
        justLanded = true;
      }
    } else if (!wasGrounded && grounded.current) {
      justLanded = true;
    }

    // The velocity is deliberately left alone after a contact. An earlier
    // version of this file cut it to 30% whenever the avatar touched
    // something, which made running past a prop feel like wading. Rapier has
    // already removed the component heading into the obstacle; the component
    // sliding along it should survive untouched.

    /* 7. Face the way it is going, then pick a clip ---------------------- */

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

    // The jump clip owns the avatar until the feet are back down. Keyed off
    // `airborne` for the same reason the vertical path is: Rapier still calls
    // the character grounded on the way up, so testing its flag here handed
    // the legs straight back to the walk clip mid-jump.
    if (airborne.current || !grounded.current) return;

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

    /* 8. Footsteps ------------------------------------------------------ */

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
