"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import {
  LANGUAGES,
  PERSONAL_INFO,
  SUMMARY,
} from "@/app/constants/portfolio.constants";
import { SCALE } from "@/app/constants/world.constants";
import {
  HoloBoard,
  HoloText,
  ScanBeam,
  darkMetalMaterial,
  metalMaterial,
} from "../parts";
import Station from "../Station";
import { zoneById } from "../zones";

/**
 * The introduction, projected off a plinth.
 *
 * The summary is long, so it lives on a holographic board you read by walking
 * up and pressing interact — the camera moves in rather than an overlay
 * opening over the scene.
 */
const AboutPillar = () => {
  const zone = zoneById("about");
  const cage = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (cage.current) cage.current.rotation.y += delta * 0.3;
  });

  return (
    <Station
      zone={zone}
      signHeight={0.2}
      focusCamera={[0, 0.115, 0.24]}
      focusTarget={[0, 0.105, 0]}
    >
      {/* Plinth */}
      <mesh position={[0, 0.032 * SCALE, 0]} material={darkMetalMaterial}>
        <cylinderGeometry
          args={[0.045 * SCALE, 0.055 * SCALE, 0.008 * SCALE, 6]}
        />
      </mesh>
      <mesh position={[0, 0.055 * SCALE, 0]} material={metalMaterial}>
        <cylinderGeometry
          args={[0.011 * SCALE, 0.016 * SCALE, 0.04 * SCALE, 6]}
        />
      </mesh>

      {/* A turning cage of light above the plinth. */}
      <group ref={cage} position={[0, 0.082 * SCALE, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, (i * Math.PI) / 3]}>
            <torusGeometry args={[0.02 * SCALE, 0.0011 * SCALE, 8, 40]} />
            <meshBasicMaterial
              color={zone.accent}
              transparent
              opacity={0.55}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* The board, angled slightly back the way a lectern would be. */}
      <group position={[0, 0.112 * SCALE, 0.012 * SCALE]} rotation={[-0.08, 0, 0]}>
        <HoloBoard width={0.165} height={0.088} color={zone.accent} opacity={0.12} />

        <HoloText
          position={[0, 0.03 * SCALE, 0.001 * SCALE]}
          size={0.0092}
          color="#ffffff"
        >
          {PERSONAL_INFO.name}
        </HoloText>

        <HoloText
          position={[0, 0.019 * SCALE, 0.001 * SCALE]}
          size={0.0046}
          color={zone.accent}
        >
          {PERSONAL_INFO.title}
        </HoloText>

        <HoloText
          position={[0, -0.002 * SCALE, 0.001 * SCALE]}
          size={0.0039}
          color="#cbd5e1"
          width={0.15}
        >
          {SUMMARY.slice(0, 330) + "…"}
        </HoloText>

        <HoloText
          position={[0, -0.034 * SCALE, 0.001 * SCALE]}
          size={0.0036}
          color="#94a3b8"
          width={0.15}
        >
          {LANGUAGES.map((l) => l.name).join("  ·  ")}
        </HoloText>
      </group>

      <ScanBeam color={zone.accent} height={0.12} radius={0.05} />
    </Station>
  );
};

export default AboutPillar;
