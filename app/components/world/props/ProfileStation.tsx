"use client";

import { Image, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  CONTACT,
  EDUCATION,
  EXPERIENCE,
  LANGUAGES,
  PERSONAL_INFO,
  SUMMARY,
} from "@/app/constants/portfolio.constants";
import { metres, PROFILE_STATION } from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import { HoloText, darkMetalMaterial, metalMaterial } from "../parts";
import { useInteractable } from "../useInteractable";

/**
 * THE CV, AS FOUR STANDING STONES.
 *
 * Everything in `portfolio.constants` that is not a project, a certificate or
 * a skill: who he is, where he has worked, where he studied, what he speaks,
 * and how to reach him.
 *
 * ## Why four pillars and not one big board
 *
 * The deck already has one big board — the controls kiosk — and a second thing
 * of the same shape reads as a duplicate of it. More usefully, these four
 * sections are not a list: they are four independent facts, and a visitor
 * wants one of them (usually the last). Four separate stones you can walk
 * between make that choice physical, and the contact stone can then be the
 * one that is lit differently and taller, because it is the one with a call
 * to action on it.
 *
 * The panels are angled inward so that standing in the middle of the four puts
 * all of them within reading distance at once — the arrangement does the work
 * a layout would do on a page.
 */

/** Each stone, in metres. */
const STONE = {
  width: 6,
  height: 8.4,
  thickness: 0.55,
  plinth: 0.7,
};

/** How far the stones stand from the middle of the station. */
const SPREAD = 5.5;

const experience = EXPERIENCE[0];
const education = EDUCATION[0];

/** A logo hung on a stone, at the top. Local files, so no CORS shim needed. */
const Badge = ({ url }: { url: string }) => (
  <Suspense fallback={null}>
    {/* drei's <Image> is a textured plane in the scene, not an <img>. */}
    {/* eslint-disable-next-line jsx-a11y/alt-text */}
    <Image
      url={url}
      transparent
      scale={[metres(1.5), metres(1.5)]}
      toneMapped={false}
    />
  </Suspense>
);

type Line = { text: string; size: number; colour: string; gap?: number };

/**
 * One stone.
 *
 * Takes its content as a flat list of lines rather than as children so that
 * the vertical rhythm is computed in one place — four stones laid out by hand
 * drift apart the first time one of them gains a line.
 */
const Stone = ({
  angle,
  title,
  accent,
  lines,
  badge,
  tall,
  onClick,
}: {
  angle: number;
  title: string;
  accent: string;
  lines: Line[];
  badge?: string;
  tall?: boolean;
  onClick?: () => void;
}) => {
  const height = STONE.height * (tall ? 1.16 : 1);
  const face = metres(STONE.thickness / 2 + 0.04);

  /**
   * Where each line sits, measured down from the top of the reading area.
   *
   * Worked out up front rather than by advancing a cursor inside the map:
   * a running total mutated during render is the sort of thing that behaves
   * differently the second time React calls the component.
   */
  const baselines: number[] = [];

  lines.reduce((cursor, line) => {
    const next = cursor - (line.gap ?? line.size * 1.9);
    baselines.push(next);
    return next;
  }, height / 2 - 2.6);

  return (
    <group
      position={[
        Math.sin(angle) * metres(SPREAD),
        0,
        -Math.cos(angle) * metres(SPREAD),
      ]}
      /*
       * Turned to face the middle of the ring, where the reader stands.
       *
       * `-angle`, not `angle + PI`. A station group is rotated so its local
       * +Z points at the centre of the deck, so inside a station the viewer is
       * towards +Z, and a panel at `angle` round the ring faces back along it
       * with a rotation of `-angle`. `angle + PI` flips the Z component as
       * well and points the lettering out through the glass.
       */
      rotation={[0, -angle, 0]}
    >
      <mesh position={[0, metres(STONE.plinth / 2), 0]} material={metalMaterial}>
        <boxGeometry
          args={[metres(STONE.width), metres(STONE.plinth), metres(STONE.thickness * 2)]}
        />
      </mesh>

      <group position={[0, metres(STONE.plinth + height / 2), 0]}>
        <mesh material={darkMetalMaterial} onClick={onClick}>
          <boxGeometry
            args={[metres(STONE.width), metres(height), metres(STONE.thickness)]}
          />
        </mesh>

        {/* Lit face, so the stone reads as a screen rather than a slab. */}
        <mesh position={[0, 0, metres(STONE.thickness / 2 + 0.01)]}>
          <planeGeometry
            args={[metres(STONE.width - 0.5), metres(height - 0.5)]}
          />
          <meshBasicMaterial color="#0b2033" transparent opacity={0.9} />
        </mesh>

        {/* A band of the section's own colour across the top. */}
        <mesh
          position={[0, metres(height / 2 - 1.5), metres(STONE.thickness / 2 + 0.02)]}
        >
          <planeGeometry args={[metres(STONE.width - 0.5), metres(0.08)]} />
          <meshBasicMaterial color={accent} />
        </mesh>

        {badge && (
          <group position={[0, metres(height / 2 - 0.85), face]}>
            <Badge url={badge} />
          </group>
        )}

        <HoloText
          position={[0, metres(height / 2 - 2.05), face]}
          size={0.72}
          color={accent}
        >
          {title}
        </HoloText>

        {lines.map((line, row) => (
          <HoloText
            key={line.text}
            position={[0, metres(baselines[row]), face]}
            size={line.size}
            color={line.colour}
            width={STONE.width * 0.86}
          >
            {line.text}
          </HoloText>
        ))}
      </group>
    </group>
  );
};

const ProfileStation = () => {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);

  useInteractable({
    ref: group,
    id: "profile",
    label: "About",
    verb: "Read",
    radius: metres(11),
  });

  useFrame(({ clock }) => {
    // The ring on the ground breathes, which is what draws people into the
    // middle of the four stones — which is the one spot they all read from.
    if (halo.current) {
      const material = halo.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(clock.elapsedTime * 1.2) * 0.08;
    }
  });

  const stones = useMemo(
    () => [
      {
        angle: -Math.PI * 0.42,
        title: "EXPERIENCE",
        accent: "#fbbf24",
        badge: experience.logo,
        lines: [
          { text: experience.role, size: 0.56, colour: "#ffffff" },
          { text: experience.company, size: 0.46, colour: "#fbbf24" },
          {
            text: `${experience.startDate} — ${experience.endDate}`,
            size: 0.36,
            colour: "#94a3b8",
          },
          { text: experience.location, size: 0.32, colour: "#7a8da0" },
          {
            text: `${experience.employmentType} · ${experience.workplaceType}`,
            size: 0.32,
            colour: "#7a8da0",
          },
        ] as Line[],
      },
      {
        angle: -Math.PI * 0.14,
        title: "EDUCATION",
        accent: "#c084fc",
        badge: education.logo,
        lines: [
          { text: education.institution, size: 0.44, colour: "#ffffff" },
          { text: education.degree, size: 0.4, colour: "#c084fc" },
          { text: education.fieldOfStudy, size: 0.36, colour: "#94a3b8" },
          {
            text: `${education.startYear} — ${education.endYear}`,
            size: 0.34,
            colour: "#7a8da0",
          },
          { text: `CGPA ${education.CGPA}`, size: 0.4, colour: "#e2e8f0" },
        ] as Line[],
      },
      {
        angle: Math.PI * 0.14,
        title: "LANGUAGES",
        accent: "#34d399",
        lines: LANGUAGES.flatMap((language) => [
          { text: language.name, size: 0.46, colour: "#ffffff" },
          { text: language.proficiency, size: 0.3, colour: "#8aa0b4", gap: 0.5 },
        ]) as Line[],
      },
      {
        angle: Math.PI * 0.42,
        title: "GET IN TOUCH",
        accent: "#5eead4",
        tall: true,
        lines: [
          { text: CONTACT.email, size: 0.42, colour: "#5eead4" },
          { text: CONTACT.mobile, size: 0.42, colour: "#e2e8f0" },
          { text: "linkedin.com/in/monishwar", size: 0.34, colour: "#7dd3fc" },
          { text: "github.com/monishwarmc", size: 0.34, colour: "#7dd3fc" },
          { text: CONTACT.location, size: 0.3, colour: "#7a8da0" },
          { text: "click this stone to open LinkedIn ↗", size: 0.3, colour: "#5eead4" },
        ] as Line[],
        onClick: () => {
          playSfx("open", 0.4);
          window.open(CONTACT.linkedin, "_blank", "noopener,noreferrer");
        },
      },
    ],
    [],
  );

  return (
    <group
      ref={group}
      position={PROFILE_STATION.position}
      rotation={[0, PROFILE_STATION.facing, 0]}
    >
      {/* The name and the summary, floating over the middle of the circle. */}
      <group position={[0, metres(13.5), 0]}>
        <Text
          fontSize={metres(1.6)}
          anchorX="center"
          anchorY="middle"
          renderOrder={999}
        >
          {PERSONAL_INFO.name.toUpperCase()}
          <meshStandardMaterial
            color="#eafff8"
            emissive="#5eead4"
            emissiveIntensity={2.2}
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
            transparent
          />
        </Text>

        <HoloText position={[0, metres(-1.6), 0]} size={0.6} color="#7dd3fc" onTop>
          {PERSONAL_INFO.title}
        </HoloText>

        <HoloText
          position={[0, metres(-3.6), 0]}
          size={0.42}
          color="#9fb6c9"
          width={26}
          onTop
        >
          {SUMMARY}
        </HoloText>
      </group>

      {/* The ring that marks the spot all four stones read from. */}
      <mesh ref={halo} position={[0, metres(0.04), 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[metres(2.1), metres(2.6), 48]} />
        <meshBasicMaterial color="#5eead4" transparent opacity={0.25} />
      </mesh>

      {stones.map((stone) => (
        <Stone key={stone.title} {...stone} />
      ))}
    </group>
  );
};

export default ProfileStation;
