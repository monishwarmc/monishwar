"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { useMonishwar } from "../../contexts/MonishwarContext";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const targetPosition = new THREE.Vector3();

export default function Camera() {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const { ref: monishwarRef } = useMonishwar();

  useFrame((_, delta) => {
    if (!controlsRef.current || !monishwarRef.current) return;

    const character = monishwarRef.current;

    targetPosition.copy(character.position);
    targetPosition.y += 1;

    controlsRef.current.target.lerp(targetPosition, 1 - Math.exp(-8 * delta));

    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={6}
      maxDistance={8}
      minPolarAngle={THREE.MathUtils.degToRad(55)}
      maxPolarAngle={THREE.MathUtils.degToRad(85)}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
