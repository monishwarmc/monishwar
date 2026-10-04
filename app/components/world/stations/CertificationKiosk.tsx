"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { CERTIFICATIONS } from "@/app/constants/portfolio.constants";
import { SCALE } from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import {
  Button3D,
  HoloBoard,
  HoloText,
  LogoPlate,
  darkMetalMaterial,
  metalMaterial,
} from "../parts";
import Station from "../Station";
import { zoneById } from "../zones";
import { useZoneState } from "../zoneState";

/**
 * Certifications, shown on a tablet standing on a plinth.
 *
 * The certificate images themselves live on Coursera, Credly and friends, and
 * pulling those into a WebGL texture would need their CORS headers to
 * cooperate — which they do not. So the tablet shows the issuer's local logo,
 * the title and the date, and the VERIFY button opens the real credential.
 */
const CertificationKiosk = () => {
  const zone = zoneById("certifications");
  const { nearest, focused } = useZoneState();

  const [index, setIndex] = useState(0);
  const cert = CERTIFICATIONS[index];

  const tablet = useRef<THREE.Group>(null);
  const atStation = nearest === "certifications" || focused === "certifications";

  useFrame(({ clock }) => {
    if (!tablet.current) return;

    // The tablet idles with a slow tilt and settles square when read.
    const idle = Math.sin(clock.elapsedTime * 0.7) * 0.06;
    tablet.current.rotation.y = atStation ? idle * 0.15 : idle;
    tablet.current.position.y =
      0.105 * SCALE + Math.sin(clock.elapsedTime * 1.1) * 0.0015 * SCALE;
  });

  const step = (by: number) =>
    setIndex(
      (current) =>
        (current + by + CERTIFICATIONS.length) % CERTIFICATIONS.length,
    );

  return (
    <Station
      zone={zone}
      signHeight={0.185}
      focusCamera={[0, 0.115, 0.22]}
      focusTarget={[0, 0.105, 0]}
    >
      {/* Plinth */}
      <mesh position={[0, 0.034 * SCALE, 0]} material={darkMetalMaterial}>
        <cylinderGeometry
          args={[0.038 * SCALE, 0.05 * SCALE, 0.008 * SCALE, 16]}
        />
      </mesh>
      <mesh position={[0, 0.055 * SCALE, 0]} material={metalMaterial}>
        <cylinderGeometry
          args={[0.006 * SCALE, 0.009 * SCALE, 0.042 * SCALE, 8]}
        />
      </mesh>

      {/* Arch of honour behind the tablet */}
      <mesh position={[0, 0.034 * SCALE, -0.02 * SCALE]} material={metalMaterial}>
        <torusGeometry args={[0.07 * SCALE, 0.004 * SCALE, 8, 28, Math.PI]} />
      </mesh>

      <group ref={tablet} position={[0, 0.105 * SCALE, 0.016 * SCALE]}>
        {/* Tablet body */}
        <mesh material={darkMetalMaterial}>
          <boxGeometry args={[0.1 * SCALE, 0.072 * SCALE, 0.004 * SCALE]} />
        </mesh>

        <HoloBoard
          width={0.094}
          height={0.066}
          color={zone.accent}
          opacity={atStation ? 0.2 : 0.1}
          position={[0, 0, 0.0025 * SCALE]}
        />

        <LogoPlate
          url={cert.logo}
          size={0.022}
          position={[-0.03 * SCALE, 0.012 * SCALE, 0.003 * SCALE]}
        />

        <HoloText
          position={[0.014 * SCALE, 0.016 * SCALE, 0.003 * SCALE]}
          size={0.0046}
          color="#ffffff"
          width={0.058}
        >
          {cert.name}
        </HoloText>

        <HoloText
          position={[-0.03 * SCALE, -0.006 * SCALE, 0.003 * SCALE]}
          size={0.0042}
          color="#cbd5e1"
          width={0.04}
        >
          {cert.issuer}
        </HoloText>

        <HoloText
          position={[0, -0.022 * SCALE, 0.003 * SCALE]}
          size={0.004}
          color={zone.accent}
        >
          {`${cert.issued}  ·  ${index + 1} / ${CERTIFICATIONS.length}`}
        </HoloText>
      </group>

      {/* Tablet controls */}
      <group position={[0, 0.058 * SCALE, 0.03 * SCALE]}>
        <Button3D
          label="‹"
          position={[-0.04 * SCALE, 0, 0]}
          width={0.018}
          height={0.014}
          textSize={0.008}
          color={zone.accent}
          onPress={() => step(-1)}
        />
        <Button3D
          label="VERIFY"
          position={[0, 0, 0]}
          width={0.05}
          height={0.014}
          textSize={0.0048}
          color={zone.accent}
          onPress={() => {
            playSfx("open");
            window.open(cert.link, "_blank", "noopener,noreferrer");
          }}
        />
        <Button3D
          label="›"
          position={[0.04 * SCALE, 0, 0]}
          width={0.018}
          height={0.014}
          textSize={0.008}
          color={zone.accent}
          onPress={() => step(1)}
        />
      </group>

    </Station>
  );
};

export default CertificationKiosk;
