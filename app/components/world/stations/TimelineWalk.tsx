"use client";

import { useMemo } from "react";
import { EDUCATION, EXPERIENCE } from "@/app/constants/portfolio.constants";
import { SCALE } from "@/app/constants/world.constants";
import { HoloBoard, HoloText, LogoPlate, metalMaterial } from "../parts";
import Station from "../Station";
import { zoneById } from "../zones";

/**
 * Work and study as a walkway you can actually walk along.
 *
 * Each stop is a lit post with the institution's logo on a board, laid out
 * left to right in time order. Everything is in the scene — there is no panel
 * to open.
 */
const TimelineWalk = () => {
  const zone = zoneById("experience");

  const stops = useMemo(
    () => [
      ...EDUCATION.map((item) => ({
        key: item.institution,
        when: `${item.startYear} – ${item.endYear}`,
        title: item.institution,
        sub: `${item.degree}, ${item.fieldOfStudy}`,
        note: `CGPA ${item.CGPA}`,
        logo: item.logo,
        tone: "#38bdf8",
      })),
      ...EXPERIENCE.map((item) => ({
        key: item.company,
        when: `${item.startDate} – ${item.endDate}`,
        title: item.company,
        sub: item.role,
        note: `${item.location}`,
        logo: item.logo,
        tone: "#4ade80",
      })),
    ],
    [],
  );

  const span = 0.3 * SCALE;

  return (
    <Station
      zone={zone}
      signHeight={0.185}
      focusCamera={[0, 0.115, 0.32]}
      focusTarget={[0, 0.095, 0]}
    >
      {/* Walkway */}
      <mesh position={[0, 0.0306, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[span + 0.07 * SCALE, 0.06 * SCALE]} />
        <meshStandardMaterial color="#1f2937" roughness={0.85} metalness={0.2} />
      </mesh>

      {/* The line of time itself */}
      <mesh position={[0, 0.0308, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[span, 0.0035 * SCALE]} />
        <meshBasicMaterial color={zone.accent} transparent opacity={0.85} />
      </mesh>

      {stops.map((stop, index) => {
        const t = stops.length === 1 ? 0.5 : index / (stops.length - 1);
        const x = (t - 0.5) * span;
        // Alternate the board heights so neighbouring cards never overlap.
        const lift = (0.072 + (index % 2) * 0.026) * SCALE;

        return (
          <group key={stop.key} position={[x, 0, 0]}>
            <mesh position={[0, lift / 2 + 0.03 * SCALE, 0]} material={metalMaterial}>
              <cylinderGeometry
                args={[0.0022 * SCALE, 0.0022 * SCALE, lift, 6]}
              />
            </mesh>

            <mesh position={[0, 0.0315, 0]}>
              <sphereGeometry args={[0.005 * SCALE, 10, 8]} />
              <meshStandardMaterial
                color={stop.tone}
                emissive={stop.tone}
                emissiveIntensity={1.6}
              />
            </mesh>

            <group position={[0, lift + 0.032 * SCALE, 0.001 * SCALE]}>
              <HoloBoard
                width={0.068}
                height={0.05}
                color={stop.tone}
                opacity={0.14}
              />

              <LogoPlate
                url={stop.logo}
                size={0.019}
                position={[-0.021 * SCALE, 0.007 * SCALE, 0.001 * SCALE]}
              />

              <HoloText
                position={[0.011 * SCALE, 0.012 * SCALE, 0.001 * SCALE]}
                size={0.0042}
                color="#ffffff"
                width={0.042}
              >
                {stop.title}
              </HoloText>

              <HoloText
                position={[0.011 * SCALE, -0.001 * SCALE, 0.001 * SCALE]}
                size={0.0034}
                color="#94a3b8"
                width={0.042}
              >
                {stop.sub}
              </HoloText>

              <HoloText
                position={[0, -0.014 * SCALE, 0.001 * SCALE]}
                size={0.0036}
                color={stop.tone}
              >
                {stop.when}
              </HoloText>

              <HoloText
                position={[0, -0.021 * SCALE, 0.001 * SCALE]}
                size={0.003}
                color="#64748b"
                width={0.06}
              >
                {stop.note}
              </HoloText>
            </group>
          </group>
        );
      })}
    </Station>
  );
};

export default TimelineWalk;
