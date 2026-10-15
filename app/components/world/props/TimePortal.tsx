"use client";

import { Image, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { EDUCATION, EXPERIENCE } from "@/app/constants/portfolio.constants";
import {
  metres,
  PORTAL_RIG,
  PORTAL_SPAN,
  PORTAL_STATION,
} from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import { HoloText, darkMetalMaterial, metalMaterial } from "../parts";
import { useInteractable } from "../useInteractable";

/** One shared card system gives the two milestones the same visual rhythm. */
const PANEL = PORTAL_RIG.panel;

type Milestone = {
  side: -1 | 1;
  index: string;
  title: string;
  when: string;
  accent: string;
  badge: string;
  headline: string;
  subhead: string;
  detail: string;
  stat: string;
  statLabel: string;
  footer: string;
};

const education = EDUCATION[0];
const experience = EXPERIENCE[0];

const MILESTONES: Milestone[] = [
  {
    side: -1,
    index: "01 / FOUNDATION",
    title: "EDUCATION",
    when: `${education.startYear} — ${education.endYear}`,
    accent: "#c084fc",
    badge: education.logo,
    headline: education.degree,
    subhead: education.fieldOfStudy,
    detail: education.institution,
    stat: String(education.CGPA),
    statLabel: "CGPA",
    footer: "ENGINEERING · SYSTEMS THINKING",
  },
  {
    side: 1,
    index: "02 / IN PRACTICE",
    title: "EXPERIENCE",
    when: `${experience.startDate} — ${experience.endDate}`,
    accent: "#fbbf24",
    badge: experience.logo,
    headline: experience.role,
    subhead: experience.company,
    detail: `${experience.employmentType} · ${experience.workplaceType}\n${experience.location}`,
    stat: "JSW",
    statLabel: "STEEL",
    footer: "VIJAYANAGARA · KARNATAKA",
  },
];

const YEARS = [
  { label: "2020", at: -PORTAL_SPAN / 2 },
  { label: "2024", at: 0 },
  { label: "NOW", at: PORTAL_SPAN / 2 },
];

const Badge = ({ url }: { url: string }) => (
  <Suspense fallback={null}>
    {/* drei's Image is a textured plane inside the 3D scene. */}
    {/* eslint-disable-next-line jsx-a11y/alt-text */}
    <Image
      url={url}
      transparent
      scale={[metres(0.68), metres(0.68)]}
      toneMapped={false}
    />
  </Suspense>
);

const TimePortal = () => {
  const group = useRef<THREE.Group>(null);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);

  useInteractable({
    ref: group,
    id: "portal",
    label: "Career timeline",
    verb: "Read",
    radius: metres(8),
  });

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    pulses.current.forEach((pulse, index) => {
      if (!pulse) return;

      const progress = (time / 2.8 + index / 2) % 1;
      pulse.scale.setScalar(0.65 + progress * 0.85);
      (pulse.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - progress);
    });
  });

  const panelCenter = PANEL.height / 2 + PANEL.support;

  return (
    <group
      ref={group}
      position={PORTAL_STATION.position}
      rotation={[0, PORTAL_STATION.facing, 0]}
    >
      {/* A single lit timeline ties the two records together. */}
      <mesh position={[0, metres(0.035), 0]}>
        <boxGeometry args={[metres(PORTAL_SPAN), metres(0.035), metres(0.16)]} />
        <meshBasicMaterial color="#343044" />
      </mesh>
      <mesh position={[metres(-PORTAL_SPAN / 4), metres(0.06), 0]}>
        <boxGeometry args={[metres(PORTAL_SPAN / 2), metres(0.025), metres(0.09)]} />
        <meshBasicMaterial color="#a855f7" toneMapped={false} />
      </mesh>
      <mesh position={[metres(PORTAL_SPAN / 4), metres(0.06), 0]}>
        <boxGeometry args={[metres(PORTAL_SPAN / 2), metres(0.025), metres(0.09)]} />
        <meshBasicMaterial color="#f59e0b" toneMapped={false} />
      </mesh>

      {YEARS.map(({ label, at }) => (
        <group key={label} position={[metres(at), metres(0.08), 0]}>
          <mesh>
            <cylinderGeometry args={[metres(0.09), metres(0.09), metres(0.2), 10]} />
            <meshStandardMaterial
              color={label === "2020" ? "#c084fc" : "#fbbf24"}
              emissive={label === "2020" ? "#a855f7" : "#f59e0b"}
              emissiveIntensity={1.5}
              toneMapped={false}
            />
          </mesh>
          <HoloText
            position={[0, metres(0.04), metres(0.36)]}
            rotation={[-Math.PI / 2, 0, 0]}
            size={0.24}
            color="#dbeafe"
          >
            {label}
          </HoloText>
        </group>
      ))}

      {[-1, 1].map((side) => (
        <mesh
          key={`branch-${side}`}
          position={[
            metres(side * PORTAL_RIG.sideOffset),
            metres(0.14),
            metres(PORTAL_RIG.forwardOffset / 2),
          ]}
          rotation={[0, side * -0.24, 0]}
        >
          <boxGeometry
            args={[metres(0.04), metres(0.18), metres(PORTAL_RIG.forwardOffset)]}
          />
          <meshBasicMaterial color={side < 0 ? "#c084fc" : "#fbbf24"} />
        </mesh>
      ))}

      {MILESTONES.map((milestone, index) => (
        <group
          key={milestone.title}
          position={[
            metres(milestone.side * PORTAL_RIG.sideOffset),
            metres(panelCenter),
            metres(PORTAL_RIG.forwardOffset),
          ]}
        >
          {/* Slim feet lift the record off the timeline. */}
          {[-1, 1].map((post) => (
            <mesh
              key={post}
              position={[
                metres(post * (PANEL.width * 0.34)),
                metres(-PANEL.height / 2 - PANEL.support / 2),
                0,
              ]}
              material={metalMaterial}
            >
              <cylinderGeometry
                args={[metres(0.065), metres(0.085), metres(PANEL.support), 8]}
              />
            </mesh>
          ))}

          {/* The folio: dark, quiet, and readable against the active world. */}
          <mesh material={darkMetalMaterial}>
            <boxGeometry args={[metres(PANEL.width), metres(PANEL.height), metres(PANEL.depth)]} />
          </mesh>
          <mesh position={[0, 0, metres(PANEL.depth / 2 + 0.006)]}>
            <planeGeometry args={[metres(PANEL.width - 0.16), metres(PANEL.height - 0.16)]} />
            <meshBasicMaterial color="#090f1a" />
          </mesh>
          <mesh position={[0, metres(PANEL.height / 2 - 0.76), metres(PANEL.depth / 2 + 0.012)]}>
            <planeGeometry args={[metres(PANEL.width - 0.16), metres(1.52)]} />
            <meshBasicMaterial color="#151522" />
          </mesh>
          <mesh
            position={[
              metres(-PANEL.width / 2 + 0.09),
              0,
              metres(PANEL.depth / 2 + 0.02),
            ]}
          >
            <planeGeometry args={[metres(0.14), metres(PANEL.height - 0.4)]} />
            <meshBasicMaterial color={milestone.accent} />
          </mesh>

          <group
            position={[
              metres(-PANEL.width / 2 + 0.55),
              metres(PANEL.height / 2 - 0.78),
              metres(PANEL.depth / 2 + 0.04),
            ]}
          >
            <Badge url={milestone.badge} />
          </group>

          <HoloText
            position={[
              metres(-PANEL.width / 2 + 1.08),
              metres(PANEL.height / 2 - 0.55),
              metres(PANEL.depth / 2 + 0.04),
            ]}
            size={0.19}
            color={milestone.accent}
            anchorX="left"
          >
            {milestone.index}
          </HoloText>
          <HoloText
            position={[
              metres(-PANEL.width / 2 + 1.08),
              metres(PANEL.height / 2 - 1.05),
              metres(PANEL.depth / 2 + 0.04),
            ]}
            size={0.33}
            color="#f8fafc"
            anchorX="left"
          >
            {milestone.title}
          </HoloText>
          <HoloText
            position={[
              metres(-PANEL.width / 2 + 1.08),
              metres(PANEL.height / 2 - 1.38),
              metres(PANEL.depth / 2 + 0.04),
            ]}
            size={0.21}
            color="#cbd5e1"
            anchorX="left"
          >
            {milestone.when}
          </HoloText>

          <mesh position={[0, metres(0.94), metres(PANEL.depth / 2 + 0.02)]}>
            <planeGeometry args={[metres(PANEL.width - 0.6), metres(0.025)]} />
            <meshBasicMaterial color={milestone.accent} transparent opacity={0.8} />
          </mesh>

          <HoloText
            position={[metres(-PANEL.width / 2 + 0.35), metres(0.47), metres(PANEL.depth / 2 + 0.04)]}
            size={0.33}
            color="#ffffff"
            width={PANEL.width - 0.7}
            anchorX="left"
          >
            {milestone.headline}
          </HoloText>
          <HoloText
            position={[metres(-PANEL.width / 2 + 0.35), metres(-0.08), metres(PANEL.depth / 2 + 0.04)]}
            size={0.25}
            color={milestone.accent}
            width={PANEL.width - 0.7}
            anchorX="left"
          >
            {milestone.subhead.toUpperCase()}
          </HoloText>
          <HoloText
            position={[metres(-PANEL.width / 2 + 0.35), metres(-0.7), metres(PANEL.depth / 2 + 0.04)]}
            size={0.21}
            color="#cbd5e1"
            width={PANEL.width - 0.7}
            anchorX="left"
          >
            {milestone.detail}
          </HoloText>

          <mesh position={[0, metres(-2.05), metres(PANEL.depth / 2 + 0.02)]}>
            <planeGeometry args={[metres(PANEL.width - 0.45), metres(0.82)]} />
            <meshBasicMaterial color="#121a27" />
          </mesh>
          <HoloText
            position={[metres(-PANEL.width / 2 + 0.45), metres(-2.04), metres(PANEL.depth / 2 + 0.05)]}
            size={0.42}
            color={milestone.accent}
            anchorX="left"
          >
            {milestone.stat}
          </HoloText>
          <HoloText
            position={[metres(-PANEL.width / 2 + 1.72), metres(-2.04), metres(PANEL.depth / 2 + 0.05)]}
            size={0.19}
            color="#e2e8f0"
            anchorX="left"
          >
            {milestone.statLabel}
          </HoloText>
          <HoloText
            position={[0, metres(-2.56), metres(PANEL.depth / 2 + 0.05)]}
            size={0.16}
            color="#94a3b8"
          >
            {milestone.footer}
          </HoloText>

          {/* A subtle expanding ring marks each story on the shared timeline. */}
          <mesh
            ref={(node) => {
              pulses.current[index] = node;
            }}
            position={[0, metres(-panelCenter + 0.12), metres(-1.03)]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[metres(0.18), metres(0.24), 24]} />
            <meshBasicMaterial
              color={milestone.accent}
              transparent
              opacity={0.45}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          <mesh
            position={[0, 0, metres(PANEL.depth / 2 + 0.07)]}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
              playSfx("chime", 0.12);
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          >
            <planeGeometry args={[metres(PANEL.width), metres(PANEL.height)]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}

      <Text
        position={[0, metres(8.1), 0]}
        fontSize={metres(0.9)}
        anchorX="center"
        anchorY="middle"
      >
        THE PATH SO FAR
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#a78bfa"
          emissiveIntensity={1.6}
          toneMapped={false}
          transparent
        />
      </Text>
      <HoloText
        position={[0, metres(7.35), 0]}
        size={0.23}
        color="#c4b5fd"
      >
        MECHANICAL FOUNDATIONS · INDUSTRIAL PRACTICE · SOFTWARE
      </HoloText>
    </group>
  );
};

export default TimePortal;
