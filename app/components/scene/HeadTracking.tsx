"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { MOVEMENT } from "@/app/constants/controls.constants";
import { useMonishwar } from "../contexts/MonishwarContext";

/**
 * Makes the avatar notice you.
 *
 * ## There are two behaviours here, not one
 *
 * Which applies depends on where you are standing:
 *
 *   **Behind** — the ordinary third-person view. The avatar looks *where you
 *   are looking*: orbit the camera and its head scans round with you, then
 *   settles back to centre once you stop.
 *
 *   **In front** — you can see its face. Following your gaze now would mean
 *   turning to stare over its own shoulder, away from the one person it can
 *   see, which is the dead-eyed effect this exists to avoid. So instead it
 *   looks *at you*, holds it a moment, and goes back to what it was doing.
 *
 * The neat part is that those two targets are always 180 degrees apart — the
 * camera's position and the direction it is pointing are opposite views of the
 * same line — so only one of them is ever within reach of a neck. Picking the
 * reachable one picks the right one.
 *
 * ## The shoulder
 *
 * At exactly side-on neither target is reachable and the choice flips, so
 * `engagement` falls to zero either side of the shoulder. The head is already
 * back at rest by the time the mode changes underneath it, which is what stops
 * the switch reading as a whip-crack.
 *
 * ## Signs, which are measured and not guessed
 *
 * On this rig **positive `rotation.x` tips the head down** and negative tips it
 * up; `rotation.y` turns it towards the angle you add. Both were checked by
 * driving the bones to known values and photographing the result — the comment
 * that used to be here asserted the opposite for pitch.
 *
 * Priority matters too. The animation mixer writes bone rotations at the
 * default priority of 0, so this has to run *after* it or the clip would
 * overwrite the turn every frame. 0.5 puts it between the mixer and
 * RenderGovernor, which draws at 1.
 */

/** How far the head may turn away from straight ahead. */
const MAX_YAW = 1.0;
const MAX_PITCH = 0.5;

/** Share of the total turn taken by the neck; the head takes the rest. */
const NECK_SHARE = 0.4;

/** A touch of ear-to-shoulder tilt, as a fraction of the turn. */
const HEAD_TILT = 0.14;

/** Eyes do some of the work in life, so the neck does not have to do it all. */
const PITCH_GAIN = 0.8;

/** How quickly the head catches up with a moving target, per second. */
const RESPONSE = 8;

/** Attention comes on faster than it fades. */
const NOTICE = 5;
const FORGET = 1.6;

/** Turning the view faster than this counts as the player looking around. */
const ORBIT_SPEED = 0.7;

/**
 * Where the camera has to be, as an angle off the avatar's nose, for each
 * behaviour to engage fully — and where it has given up entirely.
 *
 * The gap between the two limits is the dead band at the shoulder.
 */
const FRONT_FULL = 1.15;
const FRONT_GONE = 1.45;
const BEHIND_GONE = 1.7;
const BEHIND_FULL = 2.0;

/** How long one glance lasts, plus up to this much again at random. */
const HOLD = 2.4;
const HOLD_JITTER = 1.6;

/** Quiet time after a glance ends, plus up to this much again at random. */
const REST = 2.4;
const REST_JITTER = 3;

/** A glance while running is a flick of the eyes, not a turn of the head. */
const BUSY_DAMPING = 0.7;

/** Below this, nothing is being applied and the aim may jump freely. */
const RESTING = 0.02;

const damp = (lambda: number, delta: number) => 1 - Math.exp(-lambda * delta);

/** Shortest signed distance between two angles, in -PI..PI. */
const angleDelta = (from: number, to: number) => {
  const difference = (to - from) % (Math.PI * 2);
  return ((difference + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
};

/** Per-frame scratch space — see the note in CharacterController. */
const scratch = {
  headPosition: new THREE.Vector3(),
  bodyPosition: new THREE.Vector3(),
  previousPosition: new THREE.Vector3(),
  toCamera: new THREE.Vector3(),
  aim: new THREE.Vector3(),
  forward: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
};

const FORWARD = new THREE.Vector3(0, 0, 1);

const HeadTracking = () => {
  const { ref } = useMonishwar();
  const camera = useThree((state) => state.camera);

  // Found by name on the first frame the model exists, then kept.
  const neck = useRef<THREE.Object3D | null>(null);
  const head = useRef<THREE.Object3D | null>(null);

  // Smoothed, so the head eases round instead of snapping.
  const yaw = useRef(0);
  const pitch = useRef(0);

  /** 0 while resting, 1 while engaged with the player, eased between. */
  const attention = useRef(0);
  /** Seconds left of the current glance, and until the next one may start. */
  const hold = useRef(0);
  const quiet = useRef(1.5);

  const lastCameraYaw = useRef(0);
  /** False until the first frame has seeded the "where was it" refs. */
  const tracked = useRef(false);

  useFrame((_, rawDelta) => {
    const body = ref.current;
    if (!body) return;

    if (!neck.current || !head.current) {
      neck.current = body.getObjectByName("Neck") ?? null;
      head.current = body.getObjectByName("Head") ?? null;
      if (!neck.current || !head.current) return;
    }

    const delta = Math.min(rawDelta, 0.1);

    /* 1. Where is the player, from the avatar's point of view? ---------- */

    head.current.getWorldPosition(scratch.headPosition);
    scratch.toCamera.copy(camera.position).sub(scratch.headPosition);

    // The avatar's own facing, taken from the world matrix rather than
    // `rotation.y`: the whole world group tips as it drifts, and reading the
    // local angle made the avatar look slightly past the camera as it did.
    body.getWorldQuaternion(scratch.quaternion);
    scratch.forward.copy(FORWARD).applyQuaternion(scratch.quaternion);

    const facingYaw = Math.atan2(scratch.forward.x, scratch.forward.z);
    const towardCamera = Math.atan2(scratch.toCamera.x, scratch.toCamera.z);

    /** Where the camera is, as an angle off the avatar's nose. */
    const offNose = angleDelta(facingYaw, towardCamera);
    const away = Math.abs(offNose);
    const inFront = away < Math.PI / 2;

    /* 2. Which behaviour, and how much of it? --------------------------- */

    // Zero at the shoulder, where neither target is reachable and the choice
    // between them flips.
    const engagement = inFront
      ? 1 - THREE.MathUtils.smoothstep(away, FRONT_FULL, FRONT_GONE)
      : THREE.MathUtils.smoothstep(away, BEHIND_GONE, BEHIND_FULL);

    if (inFront) {
      // Look at the player.
      scratch.aim.copy(scratch.toCamera);
    } else {
      // Look where the player is looking.
      camera.getWorldDirection(scratch.aim);
    }

    /* 3. Is there anything worth looking at? ---------------------------- */

    // Taken from where the camera actually is rather than from the follow
    // rig's yaw, so it reads the same during the idle showcase — where a
    // different rig owns the camera and publishes nothing.
    const orbitRate = tracked.current
      ? Math.abs(angleDelta(lastCameraYaw.current, towardCamera)) / delta
      : 0;

    lastCameraYaw.current = towardCamera;

    hold.current -= delta;
    quiet.current -= delta;

    const orbiting = orbitRate > ORBIT_SPEED;

    // Orbiting is what starts a glance from behind — the avatar scanning round
    // with the view. From the front it also just looks up now and then, which
    // is the difference between a person and a mannequin facing your way.
    const worthIt = engagement > 0.05 && (orbiting || inFront);

    if (hold.current <= 0 && quiet.current <= 0 && worthIt) {
      hold.current = HOLD + Math.random() * HOLD_JITTER;
      // Counts down alongside the hold, so the quiet spell starts when the
      // glance ends rather than overlapping it.
      quiet.current = hold.current + REST + Math.random() * REST_JITTER;
    }

    // Still swinging the camera? Keep watching until it settles.
    if (orbiting && hold.current > 0) hold.current = Math.max(hold.current, 0.5);

    /* 4. How much of that glance is the avatar free to give? ------------ */

    // Measured here rather than read from the controller: this is the only
    // thing that wants it, and a world-space delta also catches the avatar
    // being carried by the drifting world group.
    body.getWorldPosition(scratch.bodyPosition);

    const travelled = tracked.current
      ? scratch.bodyPosition.distanceTo(scratch.previousPosition) / delta
      : 0;

    scratch.previousPosition.copy(scratch.bodyPosition);

    const busy = THREE.MathUtils.clamp(travelled / MOVEMENT.runSpeed, 0, 1);
    const ceiling = (1 - BUSY_DAMPING * busy) * engagement;

    const want = hold.current > 0 ? ceiling : 0;
    attention.current +=
      (want - attention.current) *
      damp(want > attention.current ? NOTICE : FORGET, delta);

    /* 5. Aim ------------------------------------------------------------ */

    const reach = Math.max(scratch.aim.length(), 1e-6);

    const wantYaw = THREE.MathUtils.clamp(
      angleDelta(facingYaw, Math.atan2(scratch.aim.x, scratch.aim.z)),
      -MAX_YAW,
      MAX_YAW,
    );

    // Positive rotation.x is *down* on this rig, so aiming upwards is negative.
    const wantPitch = THREE.MathUtils.clamp(
      -Math.asin(THREE.MathUtils.clamp(scratch.aim.y / reach, -1, 1)) *
        PITCH_GAIN,
      -MAX_PITCH,
      MAX_PITCH,
    );

    if (attention.current < RESTING) {
      // Nothing is being applied, so the aim may jump. Without this it slews
      // across the shoulder while invisible and arrives mid-swing.
      yaw.current = wantYaw;
      pitch.current = wantPitch;
    } else {
      const response = damp(RESPONSE, delta);
      yaw.current += (wantYaw - yaw.current) * response;
      pitch.current += (wantPitch - pitch.current) * response;
    }

    const turn = yaw.current * attention.current;
    const nod = pitch.current * attention.current;

    // Added on top of whatever the clip posed this frame, not replacing it.
    neck.current.rotation.y += turn * NECK_SHARE;
    neck.current.rotation.x += nod * NECK_SHARE;

    head.current.rotation.y += turn * (1 - NECK_SHARE);
    head.current.rotation.x += nod * (1 - NECK_SHARE);
    head.current.rotation.z += turn * HEAD_TILT;

    tracked.current = true;
  }, 0.5);

  return null;
};

export default HeadTracking;
