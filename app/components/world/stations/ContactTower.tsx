"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CONTACT } from "@/app/constants/portfolio.constants";
import { SCALE } from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import {
  Button3D,
  HoloText,
  darkMetalMaterial,
  metalMaterial,
} from "../parts";
import Station from "../Station";
import { zoneById } from "../zones";

/**
 * The comms mast: a lattice tower that actually transmits.
 *
 * Each channel is a pressable plate up the mast, so getting in touch is done
 * in the world rather than in a list somewhere over it.
 */
const ContactTower = () => {
  const zone = zoneById("contact");

  const dish = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const waves = useRef<THREE.Group>(null);

  const height = 0.2 * SCALE;

  const channels = useMemo(
    () => [
      { label: "GITHUB", href: CONTACT.github },
      { label: "LINKEDIN", href: CONTACT.linkedin },
      { label: "EMAIL", href: `mailto:${CONTACT.email}` },
      { label: "WHATSAPP", href: CONTACT.whatsapp },
      { label: "CALL", href: `tel:${CONTACT.mobile}` },
    ],
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (dish.current) dish.current.rotation.y = Math.sin(t * 0.4) * 0.9;
    if (beacon.current) beacon.current.emissiveIntensity = 2 + Math.sin(t * 4) * 1.8;

    // Expanding rings: the mast transmitting.
    waves.current?.children.forEach((child, index) => {
      const phase = (t * 0.45 + index / 3) % 1;
      child.scale.setScalar(0.2 + phase * 1.6);

      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = 0.35 * (1 - phase);
    });
  });

  return (
    <Station
      zone={zone}
      signHeight={0.235}
      focusCamera={[0, 0.12, 0.22]}
      focusTarget={[0, 0.11, 0]}
    >
      <mesh position={[0, 0.034 * SCALE, 0]} material={darkMetalMaterial}>
        <cylinderGeometry
          args={[0.03 * SCALE, 0.04 * SCALE, 0.008 * SCALE, 8]}
        />
      </mesh>

      {/* Lattice mast: three legs plus rungs, which reads as a tower far more
          cheaply than a modelled truss. */}
      {[0, 1, 2].map((leg) => {
        const angle = (leg / 3) * Math.PI * 2;
        return (
          <mesh
            key={leg}
            position={[
              Math.sin(angle) * 0.01 * SCALE,
              0.034 * SCALE + height / 2,
              Math.cos(angle) * 0.01 * SCALE,
            ]}
            rotation={[Math.sin(angle) * 0.05, 0, -Math.cos(angle) * 0.05]}
            material={metalMaterial}
          >
            <cylinderGeometry
              args={[0.0014 * SCALE, 0.002 * SCALE, height, 5]}
            />
          </mesh>
        );
      })}

      {Array.from({ length: 7 }).map((_, i) => (
        <mesh
          key={i}
          position={[0, 0.042 * SCALE + (i * height) / 7, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={metalMaterial}
        >
          <torusGeometry
            args={[(0.0095 - i * 0.0004) * SCALE, 0.0007 * SCALE, 5, 3]}
          />
        </mesh>
      ))}

      <group ref={dish} position={[0, 0.034 * SCALE + height * 0.8, 0]}>
        <mesh
          rotation={[Math.PI / 2.6, 0, 0]}
          position={[0, 0, 0.012 * SCALE]}
          material={metalMaterial}
        >
          <sphereGeometry
            args={[0.016 * SCALE, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]}
          />
        </mesh>
      </group>

      <mesh position={[0, 0.038 * SCALE + height, 0]}>
        <sphereGeometry args={[0.0035 * SCALE, 10, 8]} />
        <meshStandardMaterial
          ref={beacon}
          color="#ff5f5f"
          emissive="#ff3b3b"
          emissiveIntensity={2}
        />
      </mesh>

      <group
        ref={waves}
        position={[0, 0.038 * SCALE + height, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <ringGeometry args={[0.018 * SCALE, 0.021 * SCALE, 32]} />
            <meshBasicMaterial
              color={zone.accent}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Channel plates stacked up the mast — each one opens its link. */}
      {channels.map((channel, index) => (
        <Button3D
          key={channel.label}
          label={channel.label}
          position={[0, (0.062 + index * 0.023) * SCALE, 0.016 * SCALE]}
          width={0.062}
          height={0.016}
          textSize={0.0048}
          color={zone.accent}
          onPress={() => {
            playSfx("open");
            window.open(channel.href, "_blank", "noopener,noreferrer");
          }}
        />
      ))}

      <HoloText
        position={[0, 0.048 * SCALE, 0.016 * SCALE]}
        size={0.0038}
        color="#94a3b8"
        width={0.09}
      >
        {CONTACT.location}
      </HoloText>
    </Station>
  );
};

export default ContactTower;
