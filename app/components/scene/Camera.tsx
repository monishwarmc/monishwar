"use client";

import { CameraControls } from "@react-three/drei";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { useSession } from "../contexts/SessionContext";
import FollowCamera from "./FollowCamera";

/** Framing for the idle showcase: far enough out to see the whole ship. */
const IDLE_VIEW = [3.6, 1.6, 4.6, 0, 0, 0] as const;

/** Fallback until the GLB is in the graph and can be measured. */
const FALLBACK_SHELL = 4.2;

const OrbitShowcase = () => {
  const { camRef, spaceshipRef } = useSession();

  // Keeping the camera outside the hull is a measured constraint, not a magic
  // number: the solar ring reaches much further than the glass dome, so the
  // minimum orbit distance is the ship's own bounding sphere plus a margin.
  const [shell, setShell] = useState(FALLBACK_SHELL);

  useEffect(() => {
    const ship = spaceshipRef.current;
    if (!ship) return;

    const box = new THREE.Box3().setFromObject(ship);
    const sphere = box.getBoundingSphere(new THREE.Sphere());

    if (sphere.radius > 0) setShell(sphere.radius * 1.08);
  }, [spaceshipRef]);

  useEffect(() => {
    camRef.current?.setLookAt(...IDLE_VIEW, false);
  }, [camRef]);

  return (
    <CameraControls
      ref={camRef}
      // Full polar sweep so the ship can be inspected from directly overhead
      // and from underneath, which is where the solar array and thruster live.
      minPolarAngle={0.01}
      maxPolarAngle={Math.PI - 0.01}
      minDistance={shell}
      maxDistance={shell * 3.5}
      smoothTime={0.32}
      dollySpeed={0.6}
    />
  );
};

/**
 * Two camera modes, mutually exclusive.
 *
 * Idle: `CameraControls` orbits the floating spaceship from outside its hull.
 * Explore: the orbit rig is unmounted so `FollowCamera` owns the camera
 * outright — leaving both mounted would make them fight over its transform.
 */
const Camera = () => {
  const { exploring } = useSession();

  return exploring ? <FollowCamera /> : <OrbitShowcase />;
};

export default Camera;
