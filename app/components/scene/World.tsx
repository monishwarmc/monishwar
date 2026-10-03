"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Monishwar } from "../models/Monishwar";
import { Spaceship } from "../models/Spaceship";
import { useSession } from "../contexts/SessionContext";
import { Fountain } from "../models/Fountain";

/** How fast the idle drift settles once the player takes control. */
const SETTLE_RATE = 3;

const World = () => {
  // Owned here rather than shared through context: nothing outside this
  // component needs the drifting group.
  const worldRef = useRef<THREE.Group>(null);
  const { spaceshipRef, exploring } = useSession();

  useFrame((state, delta) => {
    const world = worldRef.current;
    if (!world) return;

    if (exploring) {
      // Explore mode: ease the drift out so the ground stops moving underfoot.
      const settle = 1 - Math.exp(-SETTLE_RATE * Math.min(delta, 0.1));

      world.position.y += (0 - world.position.y) * settle;
      world.rotation.z += (0 - world.rotation.z) * settle;
      world.rotation.x += (0 - world.rotation.x) * settle;
    } else {
      const elapsedTime = state.clock.getElapsedTime();

      world.position.y = Math.sin(elapsedTime * 1.9) * 0.06;
      world.rotation.z = Math.sin(elapsedTime * 1.5) * 0.01;
      world.rotation.x = Math.sin(elapsedTime * 1.6) * 0.01;
    }

    const spaceship = spaceshipRef?.current;
    if (!spaceship) return;

    const cone = spaceship.getObjectByName("Cone");
    const solar = spaceship.getObjectByName("solar");

    if (cone instanceof THREE.Mesh && solar instanceof THREE.Mesh) {
      cone.rotation.y += delta;
      solar.rotation.y += delta;
    }
  });

  return (
    <group ref={worldRef}>
      <Spaceship />
      <Monishwar />
      <Fountain />
    </group>
  );
};

export default World;
