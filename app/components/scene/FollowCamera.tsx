"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  FOLLOW_CAMERA,
  MOVEMENT,
  SPAWN,
} from "@/app/constants/controls.constants";
import {
  addLook,
  addZoom,
  consumeLook,
  consumeZoom,
  inputState,
} from "../controls/inputState";
import { publishHeading } from "../controls/heading";
import { useMonishwar } from "../contexts/MonishwarContext";
import { useSettings } from "../settings/settings";
import { useCameraClearance } from "../physics/useCameraClearance";

/** Per-frame scratch space — see the note in CharacterController. */
const scratch = {
  character: new THREE.Vector3(),
  target: new THREE.Vector3(),
  smoothTarget: new THREE.Vector3(),
  desired: new THREE.Vector3(),
  toCamera: new THREE.Vector3(),
};

/** Movement past this many pixels counts as a drag, not a tap. */
const DRAG_THRESHOLD = 8;

/** DOM surfaces that own their own clicks, scrolling, or gestures. */
const CAMERA_EXCLUDED_SURFACES =
  "button, a, input, select, textarea, [role=button], [data-scrollable], [data-scrolls], [data-project-screen], .stage-screen, .ui-panel, iframe";

/** Frame-rate independent exponential smoothing. */
const damp = (lambda: number, delta: number) => 1 - Math.exp(-lambda * delta);

/**
 * The over-the-shoulder camera.
 *
 * Three jobs, in this order every frame:
 *
 *   1. turn   — yaw and pitch from whatever dragged, mouse or finger
 *   2. place  — sit behind the avatar at the current distance
 *   3. look   — aim at its shoulders, or higher when craning upwards
 *
 * All look input is handled right here on the canvas. An earlier version used
 * a full-screen DOM layer for touch; it worked for looking but sat on top of
 * the canvas and swallowed every tap, so nothing in the 3D scene could be
 * clicked on a phone.
 */
const FollowCamera = () => {
  const { ref } = useMonishwar();
  const camera = useThree((state) => state.camera);
  const settings = useSettings();
  const clearance = useCameraClearance();

  const yaw = useRef(0);
  const pitch = useRef(0.3);
  const distance = useRef<number>(settings.cameraDistance);
  const placed = useRef(false);

  // Seat the camera behind the spawn heading. Reading it from the avatar
  // instead would depend on whether the controller's placement effect has run
  // yet, and when it had not, "forward" came out backwards.
  useEffect(() => {
    yaw.current = SPAWN.yaw + Math.PI + MOVEMENT.modelFacingOffset;
    placed.current = false;
  }, [ref]);

  useEffect(() => {
    distance.current = settings.cameraDistance;
  }, [settings.cameraDistance]);

  /* ------------------------------------------------------ pointer input */

  useEffect(() => {
    // Pointers currently down, so a two-finger pinch can be told from a drag.
    const active = new Map<number, { x: number; y: number }>();
    let pinch: number | null = null;
    let travelled = 0;

    const onPointerDown = (event: PointerEvent) => {
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });
      pinch = null;
      travelled = 0;
      inputState.dragged = false;

      // No pointer capture: the listeners are on the window, which already
      // sees the whole gesture wherever it travels.
    };

    const onPointerMove = (event: PointerEvent) => {
      const previous = active.get(event.pointerId);
      if (!previous) return;

      // A drag that started on the world can cross onto the live project
      // browser. End the camera gesture there so the screen stays still while
      // somebody is reading or interacting with it.
      const surface = document.elementFromPoint(event.clientX, event.clientY);
      if (surface?.closest(CAMERA_EXCLUDED_SURFACES)) {
        active.delete(event.pointerId);
        if (active.size < 2) pinch = null;
        return;
      }

      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;

      previous.x = event.clientX;
      previous.y = event.clientY;

      travelled += Math.hypot(dx, dy);
      if (travelled > DRAG_THRESHOLD) inputState.dragged = true;

      if (active.size >= 2) {
        const [a, b] = Array.from(active.values());
        const spread = Math.hypot(a.x - b.x, a.y - b.y);

        if (pinch !== null) addZoom((pinch - spread) * 0.0015);
        pinch = spread;
        return;
      }

      // A finger covers more screen than a mouse for the same intent.
      const gain =
        event.pointerType === "touch" ? FOLLOW_CAMERA.touchLookGain : 1;

      addLook(dx * gain, dy * gain);
    };

    const onPointerUp = (event: PointerEvent) => {
      active.delete(event.pointerId);
      if (active.size < 2) pinch = null;
    };

    const onWheel = (event: WheelEvent) => {
      // Scroll belongs to the surface under the pointer. In particular, the
      // embedded project runs in its own browsing context; zooming the camera
      // while someone reads that page makes the preview feel broken.
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(CAMERA_EXCLUDED_SURFACES)
      ) {
        return;
      }

      event.preventDefault();
      addZoom(event.deltaY * 0.0006);
    };

    // The world and Drei's HTML screens share the viewport. Listen at the
    // window so a drag can orbit over either one, then leave controls and
    // scrollable surfaces to their own pointer handlers.
    const onWindowDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest(CAMERA_EXCLUDED_SURFACES)
      ) {
        return;
      }

      onPointerDown(event);
    };

    window.addEventListener("pointerdown", onWindowDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("pointerdown", onWindowDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  /* -------------------------------------------------------- frame loop */

  useFrame((_, rawDelta) => {
    const character = ref.current;
    if (!character) return;

    const delta = Math.min(rawDelta, 0.1);
    const smoothing = settings.cameraSmoothing;

    /* 1. Turn ----------------------------------------------------------- */

    const look = consumeLook();
    const sensitivity =
      FOLLOW_CAMERA.lookSensitivity * settings.lookSensitivity;

    // Orbit the way OrbitControls and drei's CameraControls do, so explore
    // mode does not reverse the drag direction the idle view taught: both
    // subtract the horizontal delta from the azimuth.
    yaw.current -= look.x * sensitivity * (settings.invertLookX ? -1 : 1);

    pitch.current = THREE.MathUtils.clamp(
      pitch.current + look.y * sensitivity * (settings.invertLookY ? -1 : 1),
      FOLLOW_CAMERA.minPitch,
      FOLLOW_CAMERA.maxPitch,
    );

    distance.current = THREE.MathUtils.clamp(
      distance.current + consumeZoom(),
      FOLLOW_CAMERA.minDistance,
      FOLLOW_CAMERA.maxDistance,
    );

    /* 2. Place ----------------------------------------------------------- */

    character.getWorldPosition(scratch.character);

    scratch.target
      .copy(scratch.character)
      .setY(scratch.character.y + MOVEMENT.feetOffset + settings.cameraHeight);

    // Craning upwards should show the ship, not the back of the avatar's
    // head, so the aim point rises as the lens drops below the shoulders.
    const craning = Math.max(0, -pitch.current);
    scratch.target.y += craning * 0.55 * distance.current;

    const horizontal = Math.cos(pitch.current) * distance.current;

    scratch.desired.set(
      scratch.target.x + Math.sin(yaw.current) * horizontal,
      scratch.target.y + Math.sin(pitch.current) * distance.current,
      scratch.target.z + Math.cos(yaw.current) * horizontal,
    );

    // Pull in if a wall is in the way.
    //
    // Worth doing before the floor clamp below, because the clamp moves the
    // lens straight up and a lens that has already been pulled in needs less
    // of that. The deck has four large exhibits on it now and the camera used
    // to pull back straight through them.
    const reachable = clearance.clear(scratch.target, scratch.desired);
    const wanted = scratch.target.distanceTo(scratch.desired);

    if (reachable < wanted) {
      scratch.toCamera
        .copy(scratch.desired)
        .sub(scratch.target)
        .normalize()
        .multiplyScalar(reachable);

      scratch.desired.copy(scratch.target).add(scratch.toCamera);
    }

    // Never let the lens dip below the grass the avatar is standing on.
    const floor =
      scratch.character.y + MOVEMENT.feetOffset + FOLLOW_CAMERA.groundClearance;

    if (scratch.desired.y < floor) scratch.desired.y = floor;

    /* 3. Look ------------------------------------------------------------ */

    if (!placed.current) {
      // Snap on the first frame instead of flying in from the orbit rig: the
      // session should open with the avatar already close and framed.
      placed.current = true;
      scratch.smoothTarget.copy(scratch.target);
      camera.position.copy(scratch.desired);
      camera.lookAt(scratch.smoothTarget);
      publishHeading(yaw.current + Math.PI);
      return;
    }

    camera.position.lerp(
      scratch.desired,
      damp(FOLLOW_CAMERA.positionLambda * smoothing, delta),
    );

    scratch.smoothTarget.lerp(
      scratch.target,
      damp(FOLLOW_CAMERA.targetLambda * smoothing, delta),
    );

    camera.lookAt(scratch.smoothTarget);

    // The compass shows where the camera looks, which is yaw + PI.
    publishHeading(yaw.current + Math.PI);
  });

  return null;
};

export default FollowCamera;
