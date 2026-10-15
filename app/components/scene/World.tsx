"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Monishwar } from "../models/Monishwar";
import { Spaceship } from "../models/Spaceship";
import { Fountain } from "../models/Fountain";
import { useSession } from "../contexts/SessionContext";
import GrassField from "../world/GrassField";
import InteractionWatcher from "../world/InteractionWatcher";
import AboutHologram from "../world/props/AboutHologram";
import CertificateScreen from "../world/props/CertificateScreen";
import ConventionStage from "../world/props/ConventionStage";
import ContactUplink from "../world/props/ContactUplink";
import ControlBoard from "../world/props/ControlBoard";
import TimePortal from "../world/props/TimePortal";
import SkillTree from "../world/props/SkillTree";
import SofaSpot from "../world/props/SofaSpot";

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
      <GrassField />
      <Fountain />

      {/* Props. Add new ones here — see world/useInteractable.ts. */}
      <ControlBoard />
      <SofaSpot />

      {/* The six exhibits, clockwise from the spawn. Where each one stands
          is in STATIONS in world.constants — check `pnpm layout` if you move
          one. */}
      <AboutHologram />
      <ConventionStage />
      <CertificateScreen />
      <SkillTree />
      <TimePortal />
      <ContactUplink />

      <Monishwar />
      <InteractionWatcher />
    </group>
  );
};

export default World;
