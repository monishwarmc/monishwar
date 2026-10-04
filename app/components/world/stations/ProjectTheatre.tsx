"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { PROJECTS } from "@/app/constants/portfolio.constants";
import { PIXELS_TO_WORLD, SCALE } from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import { Button3D, HoloText, darkMetalMaterial } from "../parts";
import Station from "../Station";
import { zoneById } from "../zones";
import { useZoneState } from "../zoneState";

/** The screen is authored in CSS pixels, then shrunk into world space. */
const SCREEN_PX = { width: 760, height: 428 };
const SCREEN_W = SCREEN_PX.width * PIXELS_TO_WORLD;
const SCREEN_H = SCREEN_PX.height * PIXELS_TO_WORLD;

/**
 * The projects station: a drive-in screen you walk up to.
 *
 * The live site really is embedded — an iframe rendered in 3D by drei's
 * `Html transform`, sitting inside the frame rather than in an overlay on top
 * of the scene. Two rules keep that affordable:
 *
 *  1. Only one project is ever mounted, and only while the avatar is standing
 *     at the station. Six iframes of third-party sites next to a WebGL scene
 *     is how you cook a laptop.
 *  2. Until you focus the screen the iframe ignores the pointer, so dragging
 *     across it still orbits the camera instead of scrolling someone's site.
 */
const ProjectTheatre = () => {
  const zone = zoneById("projects");
  const { nearest, focused } = useZoneState();

  // Health Copilot is PROJECTS[0], so it is what the screen shows first.
  const [index, setIndex] = useState(0);
  const project = PROJECTS[index];

  const glow = useRef<THREE.MeshBasicMaterial>(null);

  const atStation = nearest === "projects" || focused === "projects";
  const interactive = focused === "projects";

  useFrame(({ clock }) => {
    if (!glow.current) return;
    // A faint flicker sells it as a powered display, not a painted board.
    glow.current.opacity =
      0.2 + Math.sin(clock.elapsedTime * 2.1) * 0.03 + (atStation ? 0.12 : 0);
  });

  const step = (by: number) => {
    setIndex((current) => (current + by + PROJECTS.length) % PROJECTS.length);
  };

  const frameW = SCREEN_W + 0.02 * SCALE;
  const frameH = SCREEN_H + 0.02 * SCALE;
  const screenY = 0.155 * SCALE;

  return (
    <Station
      zone={zone}
      signHeight={0.255}
      focusCamera={[0, 0.155, 0.32]}
      focusTarget={[0, 0.155, 0]}
    >
      {/* Legs */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[(side * frameW) / 2.4, 0.077 * SCALE, 0]}
          material={darkMetalMaterial}
        >
          <cylinderGeometry
            args={[0.004 * SCALE, 0.006 * SCALE, 0.1 * SCALE, 8]}
          />
        </mesh>
      ))}

      <group position={[0, screenY, 0]}>
        {/* Bezel */}
        <mesh material={darkMetalMaterial}>
          <boxGeometry args={[frameW, frameH, 0.005 * SCALE]} />
        </mesh>

        {/* Backlight, so the screen reads as on even before it loads */}
        <mesh position={[0, 0, 0.0028 * SCALE]}>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          <meshBasicMaterial
            ref={glow}
            color={zone.accent}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {atStation ? (
          <Html
            transform
            position={[0, 0, 0.004 * SCALE]}
            scale={PIXELS_TO_WORLD}
            // Rendered in CSS3D at the screen's place in the scene.
            style={{
              width: SCREEN_PX.width,
              height: SCREEN_PX.height,
              background: "#05070a",
              overflow: "hidden",
              borderRadius: 6,
              // Drag-to-look must keep working across the screen until the
              // player actually asks to use the site.
              pointerEvents: interactive ? "auto" : "none",
            }}
          >
            <iframe
              key={project.url}
              src={project.url}
              title={project.name}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              referrerPolicy="no-referrer"
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                background: "#05070a",
              }}
            />
          </Html>
        ) : (
          <HoloText position={[0, 0, 0.004 * SCALE]} size={0.009} color="#ffffff">
            {`${PROJECTS.length} live builds — walk up to watch`}
          </HoloText>
        )}
      </group>

      {/* Channel row: prev / counter / next, like a TV's buttons. */}
      <group position={[0, screenY - frameH / 2 - 0.016 * SCALE, 0.004 * SCALE]}>
        <Button3D
          label="‹"
          position={[-0.062 * SCALE, 0, 0]}
          width={0.022}
          height={0.016}
          textSize={0.009}
          color={zone.accent}
          onPress={() => step(-1)}
        />

        <HoloText size={0.0065} color="#e2e8f0">
          {`${index + 1} / ${PROJECTS.length}`}
        </HoloText>

        <Button3D
          label="›"
          position={[0.062 * SCALE, 0, 0]}
          width={0.022}
          height={0.016}
          textSize={0.009}
          color={zone.accent}
          onPress={() => step(1)}
        />
      </group>

      {/* Title, blurb and links, under the screen and all in 3D. */}
      <group position={[0, screenY - frameH / 2 - 0.038 * SCALE, 0.004 * SCALE]}>
        <HoloText size={0.0095} color="#ffffff" width={0.3}>
          {project.name}
        </HoloText>

        <HoloText
          position={[0, -0.016 * SCALE, 0]}
          size={0.0052}
          color="#94a3b8"
          width={0.3}
        >
          {project.description}
        </HoloText>

        <group position={[0, -0.042 * SCALE, 0]}>
          <Button3D
            label="OPEN SITE"
            position={[-0.042 * SCALE, 0, 0]}
            width={0.07}
            height={0.013}
            textSize={0.005}
            color={zone.accent}
            onPress={() => {
              playSfx("open");
              window.open(project.url, "_blank", "noopener,noreferrer");
            }}
          />
          <Button3D
            label="GITHUB"
            position={[0.042 * SCALE, 0, 0]}
            width={0.07}
            height={0.013}
            textSize={0.005}
            color="#e2e8f0"
            onPress={() => {
              playSfx("open");
              window.open(project.git, "_blank", "noopener,noreferrer");
            }}
          />
        </group>
      </group>

      <mesh position={[0, 0.0306, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[frameW * 1.1, 0.07 * SCALE]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>

    </Station>
  );
};

export default ProjectTheatre;
