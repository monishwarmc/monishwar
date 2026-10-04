"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SCALE } from "@/app/constants/world.constants";
import { HoloText, LogoPlate, darkMetalMaterial } from "../parts";
import Station from "../Station";
import { SKILL_BRANCHES } from "../skills";
import { zoneById } from "../zones";

const BARK = new THREE.MeshStandardMaterial({
  color: "#6b4f33",
  roughness: 0.9,
});

/**
 * One skill, hanging off a branch: a glowing orb with the technology's own
 * mark billboarded in front of it.
 *
 * The logos are simple-icons (CC0), fetched once and rasterised to white PNGs
 * in /public/skills. Skills with no mark — "Machine Learning", "REST APIs" —
 * fall back to the orb plus its label, which is why `logo` is optional.
 */
const Fruit = ({
  label,
  logo,
  color,
  position,
  phase,
}: {
  label: string;
  logo?: string;
  color: string;
  position: [number, number, number];
  phase: number;
}) => {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    // Fruit bobs on the same wind that moves the grass.
    group.current.position.y =
      position[1] + Math.sin(clock.elapsedTime * 1.3 + phase) * 0.0016 * SCALE;
  });

  return (
    <group ref={group} position={position}>
      <mesh>
        <sphereGeometry args={[0.0072 * SCALE, 14, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>

      {/* The mark reads from any angle, so it is billboarded. */}
      <Billboard position={[0, 0, 0]}>
        {logo && <LogoPlate url={logo} size={0.0092} position={[0, 0, 0.008 * SCALE]} />}
        <HoloText
          position={[0, -0.013 * SCALE, 0.009 * SCALE]}
          size={0.0038}
          color="#e2e8f0"
        >
          {label}
        </HoloText>
      </Billboard>
    </group>
  );
};

/**
 * Skills as a tree: six branches by discipline, each fruiting the individual
 * technologies.
 */
const SkillTree = () => {
  const zone = zoneById("skills");
  const canopy = useRef<THREE.Group>(null);

  const branches = useMemo(
    () =>
      SKILL_BRANCHES.map((branch, index) => {
        const angle = (index / SKILL_BRANCHES.length) * Math.PI * 2;
        // Branches climb as well as spread. When `lift` was small next to
        // `reach` the canopy flattened into an umbrella; keeping them the same
        // order of magnitude gives roughly 40 degrees of rise.
        const lift = 0.012 + index * 0.016;
        const reach = 0.135 + (index % 2) * 0.03;
        return { ...branch, angle, lift, reach };
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!canopy.current) return;
    canopy.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.012;
    canopy.current.rotation.x = Math.sin(clock.elapsedTime * 0.6) * 0.008;
  });

  const trunkTop = 0.182 * SCALE;

  return (
    <Station
      zone={zone}
      signHeight={0.3}
      focusCamera={[0, 0.215, 0.5]}
      focusTarget={[0, 0.195, 0]}
    >
      {/* Mound and trunk */}
      <mesh position={[0, 0.032 * SCALE, 0]} material={darkMetalMaterial}>
        <cylinderGeometry
          args={[0.05 * SCALE, 0.06 * SCALE, 0.007 * SCALE, 12]}
        />
      </mesh>
      <mesh position={[0, 0.108 * SCALE, 0]} material={BARK}>
        <cylinderGeometry
          args={[0.0075 * SCALE, 0.018 * SCALE, 0.155 * SCALE, 8]}
        />
      </mesh>

      <group ref={canopy} position={[0, trunkTop, 0]}>
        {branches.map(({ label, color, skills, angle, lift, reach }) => {
          const tipX = Math.sin(angle) * reach * SCALE;
          const tipZ = Math.cos(angle) * reach * SCALE;
          const tipY = lift * SCALE;
          const length = Math.hypot(reach * SCALE, tipY);

          return (
            <group key={label}>
              {/* Branch, aimed from the trunk to its tip. */}
              <mesh
                position={[tipX / 2, tipY / 2, tipZ / 2]}
                rotation={[0, -angle, -Math.PI / 2 + Math.atan2(tipY, reach * SCALE)]}
                material={BARK}
              >
                <cylinderGeometry
                  args={[0.0016 * SCALE, 0.0032 * SCALE, length, 5]}
                />
              </mesh>

              <HoloText
                position={[tipX * 1.18, tipY + 0.034 * SCALE, tipZ * 1.18]}
                size={0.0065}
                color={color}
                onTop
              >
                {label}
              </HoloText>

              {skills.map((skill, i) => {
                // Spread the fruit in a small arc around the branch tip.
                // Walk the fruit out along the branch rather than clustering
                // them at its tip, and fan them slightly either side of it.
                const along = 0.5 + (i / Math.max(1, skills.length - 1)) * 0.6;
                const fan = (i % 2 ? 1 : -1) * (0.14 + (i % 3) * 0.08);
                const fruitAngle = angle + fan;
                const fruitReach = reach * along;

                return (
                  <Fruit
                    key={skill.label}
                    label={skill.label}
                    logo={skill.logo}
                    color={color}
                    phase={i * 1.7 + angle}
                    position={[
                      Math.sin(fruitAngle) * fruitReach * SCALE,
                      tipY * along - (0.004 + (i % 3) * 0.016) * SCALE,
                      Math.cos(fruitAngle) * fruitReach * SCALE,
                    ]}
                  />
                );
              })}
            </group>
          );
        })}
      </group>

    </Station>
  );
};

export default SkillTree;
