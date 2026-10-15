"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  ABOUT_FOCUS,
  ABOUT_STORY,
  PERSONAL_INFO,
} from "@/app/constants/portfolio.constants";
import { ABOUT_STATION, metres } from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import { HoloText, darkMetalMaterial, metalMaterial } from "../parts";
import { useInteractable } from "../useInteractable";

/**
 * THE HOLOGRAM.
 *
 * A projector pad on the grass throwing a cone of light upward, with him
 * written inside it. Everything about it is meant to read as *projected*
 * rather than built: the cone is additive and fades out towards the top, the
 * text sits inside the volume rather than on a surface, scanlines crawl up
 * it, and the whole thing flickers very slightly, the way a projection does.
 *
 * ## The trick is subtraction
 *
 * The temptation with a hologram is to add: more rings, more particles, more
 * glow. What actually sells it is that there is *no solid object* where the
 * image is — you can see the dome straight through it, and the light cone
 * does not cast or receive. The emitter is the only lit geometry, and it is
 * deliberately heavy and industrial so the weightlessness above it has
 * something to be weightless against.
 */

/** The rig, in metres. */
const RIG = {
  pad: { radius: 3.4, height: 0.55 },
  emitters: 6,
  cone: { base: 2.6, top: 4.4, height: 7.5 },
  /** Where the lettering floats inside the cone, at reading height. */
  textLift: 4.4,
};

/** The solid core the projection rises from, in metres. */
const PILLAR = { radius: 2.1, height: 4.2 };

/** Scanline bands crawling up the cone. */
const BANDS = 9;

const AboutHologram = () => {
  const group = useRef<THREE.Group>(null);
  const cone = useRef<THREE.Mesh>(null);
  const bands = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  useInteractable({
    ref: group,
    id: "about",
    label: "About",
    verb: "Read",
    radius: metres(7),
  });

  /**
   * The light cone.
   *
   * Open at both ends and drawn from the inside as well, so walking round it
   * never shows a hard silhouette edge. `depthWrite` off and additive
   * blending are what stop it looking like a solid plastic lampshade.
   */
  const coneGeometry = useMemo(
    () =>
      new THREE.CylinderGeometry(
        metres(RIG.cone.top),
        metres(RIG.cone.base),
        metres(RIG.cone.height),
        40,
        1,
        true,
      ),
    [],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    // A projector is never perfectly steady. Two unrelated rates, so the
    // flicker never settles into a visible pulse.
    const flicker =
      0.34 + Math.sin(time * 7.3) * 0.03 + Math.sin(time * 2.1) * 0.05;

    if (cone.current) {
      (cone.current.material as THREE.MeshBasicMaterial).opacity = flicker;
    }

    // Scanlines crawl up and fade out of the top.
    if (bands.current) {
      bands.current.children.forEach((band, i) => {
        const climb = ((time * 0.22 + i / BANDS) % 1);

        band.position.y = metres(climb * RIG.cone.height);
        band.scale.setScalar(
          1 + climb * (RIG.cone.top / RIG.cone.base - 1),
        );

        const material = (band as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = 0.3 * (1 - climb) ** 0.8;
      });
    }

    // The lettering drifts and turns, so it reads as suspended.
    if (body.current) {
      body.current.position.y = metres(RIG.textLift + Math.sin(time * 0.8) * 0.18);
      body.current.rotation.y = Math.sin(time * 0.22) * 0.13;
    }

    if (ring.current) {
      ring.current.rotation.z = time * 0.4;
    }
  });

  return (
    <group
      ref={group}
      position={ABOUT_STATION.position}
      rotation={[0, ABOUT_STATION.facing, 0]}
    >
      {/* ------------------------------------------------- the emitter --- */}

      <mesh position={[0, metres(RIG.pad.height / 2), 0]} material={darkMetalMaterial}>
        <cylinderGeometry
          args={[metres(RIG.pad.radius), metres(RIG.pad.radius * 1.12), metres(RIG.pad.height), 24]}
        />
      </mesh>

      {/* A machined inner plate, recessed. */}
      <mesh position={[0, metres(RIG.pad.height + 0.02), 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[metres(RIG.pad.radius * 0.3), metres(RIG.pad.radius * 0.88), 32]} />
        <meshStandardMaterial color="#1b2733" metalness={0.9} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Emitter heads round the rim, angled inwards. */}
      {Array.from({ length: RIG.emitters }, (_, i) => {
        const angle = (i / RIG.emitters) * Math.PI * 2;
        return (
          <group
            key={i}
            position={[
              Math.sin(angle) * metres(RIG.pad.radius * 0.76),
              metres(RIG.pad.height + 0.2),
              Math.cos(angle) * metres(RIG.pad.radius * 0.76),
            ]}
            rotation={[0, angle, 0.34]}
          >
            <mesh material={metalMaterial}>
              <cylinderGeometry args={[metres(0.17), metres(0.26), metres(0.7), 8]} />
            </mesh>
            <mesh position={[0, metres(0.4), 0]}>
              <sphereGeometry args={[metres(0.17), 10, 8]} />
              <meshStandardMaterial
                color="#aefff2"
                emissive="#5eead4"
                emissiveIntensity={3}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* Stepping onto the pad gives the projector a tick, so the station
          has the same feedback as every other one. */}
      <mesh
        position={[0, metres(RIG.pad.height + 0.08), 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
          playSfx("chime", 0.14);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <circleGeometry args={[metres(RIG.pad.radius), 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* A slowly turning ring of light on the pad. */}
      <mesh
        ref={ring}
        position={[0, metres(RIG.pad.height + 0.05), 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[metres(RIG.pad.radius * 0.42), metres(RIG.pad.radius * 0.52), 6]} />
        <meshBasicMaterial color="#5eead4" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/*
        A solid core the projection stands on.

        Without this the station was words in a cone of light — nothing with
        mass, so from any distance it read as a glow rather than as a thing
        on the deck. The pillar carries the name on a physical plate at
        standing height, and the projection above it becomes the flourish
        rather than the whole exhibit.
      */}
      <group position={[0, metres(RIG.pad.height), 0]}>
        <mesh position={[0, metres(PILLAR.height / 2), 0]} material={darkMetalMaterial}>
          <cylinderGeometry
            args={[metres(PILLAR.radius * 0.82), metres(PILLAR.radius), metres(PILLAR.height), 8]}
          />
        </mesh>

        {/* Three read faces round the pillar, so it works from any approach. */}
        {[0, 1, 2].map((face) => {
          const angle = (face / 3) * Math.PI * 2;

          return (
            <group
              key={face}
              position={[
                Math.sin(angle) * metres(PILLAR.radius * 0.93),
                metres(PILLAR.height * 0.62),
                Math.cos(angle) * metres(PILLAR.radius * 0.93),
              ]}
              rotation={[0, angle, 0]}
            >
              <mesh>
                <planeGeometry args={[metres(PILLAR.radius * 1.3), metres(2.6)]} />
                <meshBasicMaterial color="#061a26" />
              </mesh>

              <HoloText position={[0, metres(0.8), metres(0.04)]} size={0.5} color="#eafff8">
                {PERSONAL_INFO.name.toUpperCase()}
              </HoloText>
              <HoloText position={[0, metres(0.1), metres(0.04)]} size={0.26} color="#7dd3fc">
                {PERSONAL_INFO.title}
              </HoloText>
              <HoloText position={[0, metres(-0.75), metres(0.04)]} size={0.22} color="#8aa0b4">
                {PERSONAL_INFO.location}
              </HoloText>
            </group>
          );
        })}

        {/* A lit cap the beam appears to come out of. */}
        <mesh position={[0, metres(PILLAR.height + 0.1), 0]}>
          <cylinderGeometry
            args={[metres(PILLAR.radius * 0.6), metres(PILLAR.radius * 0.86), metres(0.3), 8]}
          />
          <meshStandardMaterial
            color="#aefff2"
            emissive="#5eead4"
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* ---------------------------------------------- the projection --- */}

      <group position={[0, metres(RIG.pad.height + PILLAR.height), 0]}>
        <mesh
          ref={cone}
          geometry={coneGeometry}
          position={[0, metres(RIG.cone.height / 2), 0]}
        >
          <meshBasicMaterial
            color="#5eead4"
            transparent
            opacity={0.34}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <group ref={bands}>
          {Array.from({ length: BANDS }, (_, i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[metres(RIG.cone.base * 0.97), metres(RIG.cone.base), 40]} />
              <meshBasicMaterial
                color="#aefff2"
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
        </group>

        {/*
          Him, inside the light.
          
          Everything here is sized to sit *within* the cone — the cone is
          about six metres across at the reading height, and the first version
          wrote a name eleven metres wide across it. It spilled out over the
          controls kiosk two stations away, which no amount of glow fixes.

          None of it is `onTop` either. Depth-testing text that is supposed to
          be hanging in a volume is the whole point: walk round behind the
          emitter and the near side of the cone should cross in front of the
          letters, exactly as a real projection would.
        */}
        <group ref={body}>
          <Text fontSize={metres(0.82)} anchorX="center" anchorY="middle">
            {PERSONAL_INFO.name.toUpperCase()}
            <meshStandardMaterial
              color="#eafff8"
              emissive="#5eead4"
              emissiveIntensity={2.4}
              toneMapped={false}
              transparent
            />
          </Text>

          <HoloText position={[0, metres(-0.95), 0]} size={0.34} color="#7dd3fc">
            {PERSONAL_INFO.title}
          </HoloText>

          <HoloText
            position={[metres(-3.05), metres(-1.3), 0]}
            size={0.19}
            color="#5eead4"
            anchorX="left"
          >
            SYSTEMS → SOLUTIONS
          </HoloText>
          <HoloText
            position={[metres(0.12), metres(-1.3), 0]}
            size={0.19}
            color="#7dd3fc"
            anchorX="left"
          >
            IDEA → DEPLOYMENT
          </HoloText>
          <HoloText
            position={[metres(-3.05), metres(-2.55), 0]}
            size={0.16}
            color="#bfe9ff"
            width={2.88}
            anchorX="left"
          >
            {ABOUT_STORY.systems}
          </HoloText>
          <HoloText
            position={[metres(0.12), metres(-2.55), 0]}
            size={0.16}
            color="#dbeafe"
            width={2.88}
            anchorX="left"
          >
            {ABOUT_STORY.products}
          </HoloText>

          <HoloText
            position={[0, metres(-3.92), 0]}
            size={0.16}
            color="#5eead4"
          >
            {ABOUT_FOCUS}
          </HoloText>
        </group>


      </group>
    </group>
  );
};

export default AboutHologram;
