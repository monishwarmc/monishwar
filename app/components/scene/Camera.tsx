"use client";

import { CameraControls } from "@react-three/drei";
import { useEffect } from "react";
import { useSession } from "../contexts/SessionContext";
import FollowCamera from "./FollowCamera";

/** Framing for the idle showcase: far enough out to see the whole ship. */
const IDLE_VIEW = [3, 1, 4, 0, 0, 0] as const;

const OrbitShowcase = () => {
  const { camRef } = useSession();

  // The default camera carries no position of its own, so the rig that is
  // mounted decides the framing. Doing it here keeps the idle view identical
  // on first load and on every return from explore mode.
  useEffect(() => {
    camRef.current?.setLookAt(...IDLE_VIEW, false);
  }, [camRef]);

  return (
    <CameraControls
      ref={camRef}
      maxDistance={20}
      minDistance={0.5}
      maxPolarAngle={Math.PI * 0.85}
      zoom={true}
    />
  );
};

/**
 * Two camera modes, mutually exclusive.
 *
 * Idle: `CameraControls` lets visitors orbit the floating spaceship.
 * Explore: the orbit rig is unmounted so `FollowCamera` owns the camera
 * outright — leaving both mounted would make them fight over its transform.
 */
const Camera = () => {
  const { exploring } = useSession();

  return exploring ? <FollowCamera /> : <OrbitShowcase />;
};

export default Camera;
