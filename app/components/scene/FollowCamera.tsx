"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FOLLOW_CAMERA, MOVEMENT } from "@/app/constants/controls.constants";
import {
  addLook,
  addZoom,
  consumeLook,
  consumeZoom,
} from "../controls/inputState";
import { publishHeading } from "../controls/heading";
import { useMonishwar } from "../contexts/MonishwarContext";
import { useSettings } from "../settings/settings";

/** Per-frame scratch space — see the note in CharacterController. */
const scratch = {
  character: new THREE.Vector3(),
  target: new THREE.Vector3(),
  smoothTarget: new THREE.Vector3(),
  desired: new THREE.Vector3(),
};

const dampFactor = (lambda: number, delta: number) =>
  1 - Math.exp(-lambda * delta);

/**
 * Over-the-shoulder camera for explore mode.
 *
 * Look input arrives from two places and is treated identically: the touch HUD
 * pushes deltas into the shared input state, and on pointer devices this
 * component listens for a drag on the canvas itself.
 */
const FollowCamera = () => {
  const { ref } = useMonishwar();
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const settings = useSettings();

  const yaw = useRef(0);
  const pitch = useRef(0.3);
  const distance = useRef<number>(settings.cameraDistance);
  const initialised = useRef(false);

  // Start behind whichever way the avatar is already facing.
  useEffect(() => {
    const character = ref.current;

    yaw.current =
      (character?.rotation.y ?? 0) + Math.PI + MOVEMENT.modelFacingOffset;
    initialised.current = false;
  }, [ref]);

  // The slider is an absolute distance, so follow it when the player drags it.
  useEffect(() => {
    distance.current = settings.cameraDistance;
  }, [settings.cameraDistance]);

  // Drag-to-look and wheel-to-zoom for mouse and trackpad.
  useEffect(() => {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;

      addLook(event.clientX - lastX, event.clientY - lastY);

      lastX = event.clientX;
      lastY = event.clientY;
    };

    const onPointerUp = (event: PointerEvent) => {
      dragging = false;

      if (domElement.hasPointerCapture(event.pointerId)) {
        domElement.releasePointerCapture(event.pointerId);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      addZoom(event.deltaY * 0.0006);
    };

    domElement.addEventListener("pointerdown", onPointerDown);
    domElement.addEventListener("pointermove", onPointerMove);
    domElement.addEventListener("pointerup", onPointerUp);
    domElement.addEventListener("pointercancel", onPointerUp);
    domElement.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      domElement.removeEventListener("pointerdown", onPointerDown);
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerup", onPointerUp);
      domElement.removeEventListener("pointercancel", onPointerUp);
      domElement.removeEventListener("wheel", onWheel);
    };
  }, [domElement]);

  useFrame((_, rawDelta) => {
    const character = ref.current;
    if (!character) return;

    const delta = Math.min(rawDelta, 0.1);
    const look = consumeLook();
    const sensitivity = FOLLOW_CAMERA.lookSensitivity * settings.lookSensitivity;

    // Orbit the way OrbitControls and drei's CameraControls do, so explore
    // mode does not reverse the drag direction the idle view taught: both
    // subtract the horizontal delta from the azimuth (dragging right swings
    // the camera left, carrying the scene along with the finger).
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

    character.getWorldPosition(scratch.character);

    scratch.target
      .copy(scratch.character)
      .setY(
        scratch.character.y + MOVEMENT.feetOffset + settings.cameraHeight,
      );

    const horizontal = Math.cos(pitch.current) * distance.current;

    scratch.desired.set(
      scratch.target.x + Math.sin(yaw.current) * horizontal,
      scratch.target.y + Math.sin(pitch.current) * distance.current,
      scratch.target.z + Math.cos(yaw.current) * horizontal,
    );

    // Never let the lens dip below the grass the avatar is standing on.
    const floor =
      scratch.character.y + MOVEMENT.feetOffset + FOLLOW_CAMERA.groundClearance;

    if (scratch.desired.y < floor) scratch.desired.y = floor;

    if (!initialised.current) {
      // First frame of explore mode: ease in from wherever the orbit camera sat.
      initialised.current = true;
      scratch.smoothTarget.copy(scratch.target);
    }

    const smoothing = settings.cameraSmoothing;

    camera.position.lerp(
      scratch.desired,
      dampFactor(FOLLOW_CAMERA.positionLambda * smoothing, delta),
    );

    scratch.smoothTarget.lerp(
      scratch.target,
      dampFactor(FOLLOW_CAMERA.targetLambda * smoothing, delta),
    );

    camera.lookAt(scratch.smoothTarget);

    // The compass shows where the camera looks, which is yaw + PI.
    publishHeading(yaw.current + Math.PI);
  });

  return null;
};

export default FollowCamera;
