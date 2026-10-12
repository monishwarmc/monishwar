"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ControlName, describeKey } from "@/app/constants/controls.constants";
import { GROUND_Y, metres } from "@/app/constants/world.constants";
import { registerObstacle } from "../../controls/obstacles";
import { useIsTouch } from "../../hooks/useIsTouch";
import { useSettings } from "../../settings/settings";
import { HoloText, darkMetalMaterial, metalMaterial } from "../parts";

/**
 * The trailhead board on the deck: a sign you walk up to and read.
 *
 * The guided tour teaches the controls once; this is the reference that stays
 * put, for anyone who skipped it or came back a week later.
 *
 * It used to be a slab hanging in mid-air, because every measurement in it was
 * a "design unit" multiplied by SCALE, tuned by eye against an avatar less than
 * half the current size. That worked out to a seven-metre billboard with its
 * screen four metres up and its legs starting three-quarters of a metre above
 * the grass. Everything here is now in real metres instead, so it is a
 * 1.2m-wide panel whose feet are on the ground and whose top edge is about
 * eye height — the size a sign in a park actually is.
 *
 * It is device-aware: a phone has no keys to list, and a desktop has no stick.
 */

/** Stands just in front of the spawn point, angled towards it. */
const POSITION: [number, number, number] = [-0.46, GROUND_Y, 0.46];
const FACING = Math.atan2(-POSITION[0], -POSITION[2]);

/** The board, in metres. The panel hinges back from the top of its posts. */
const BOARD = {
  footing: { width: 1.3, height: 0.12, depth: 0.58 },
  /** Height of the posts the panel leans on. */
  postHeight: 0.62,
  postThickness: 0.1,
  panel: { width: 1.2, height: 0.88, thickness: 0.07 },
  /** How far the panel leans back, in radians. */
  tilt: 0.3,
};

/** Seconds for the scanline to travel once down the panel. */
const SCAN_PERIOD = 4.5;

type Row = { keys: ControlName[]; literal?: string; label: string };

const KEY_ROWS: Row[] = [
  { keys: ["forward", "left", "backward", "right"], label: "Move" },
  { keys: ["run"], label: "Sprint (hold)" },
  { keys: ["autoRun"], label: "Auto-run" },
  { keys: ["jump"], label: "Jump" },
  { keys: ["interact"], label: "Use / sit" },
  { keys: ["emote"], label: "Emotes" },
  { keys: [], literal: "Drag", label: "Look around" },
  { keys: [], literal: "Scroll", label: "Zoom in / out" },
  { keys: ["settings"], label: "Settings" },
  { keys: ["exit"], label: "Back out" },
];

const TOUCH_ROWS: { mark: string; label: string }[] = [
  { mark: "◉", label: "Stick, bottom left — move" },
  { mark: "▶", label: "Run — taps into auto-run" },
  { mark: "▲", label: "Jump" },
  { mark: "☺", label: "Emotes" },
  { mark: "↗", label: "Use / sit, when the prompt shows" },
  { mark: "✦", label: "Drag anywhere — look around" },
  { mark: "⇔", label: "Pinch — zoom in and out" },
];

const ControlBoard = () => {
  const isTouch = useIsTouch();
  const { bindings } = useSettings();

  const group = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);

  const { footing, postHeight, postThickness, panel, tilt } = BOARD;

  // Solid, so nobody walks through the sign they are meant to read.
  useEffect(() => {
    const object = group.current;
    if (!object) return;

    return registerObstacle("controlBoard", {
      object,
      radius: metres(footing.width / 2),
    });
  }, [footing.width]);

  useFrame(({ clock }) => {
    const bar = scan.current;
    if (!bar) return;

    // A line of light running down the panel, the way a display refreshes.
    // Cheaper and far more alive than pulsing the whole surface, which is
    // what this used to do — a glow that breathes reads as a lamp, a line
    // that travels reads as a screen.
    const travel = (clock.elapsedTime % SCAN_PERIOD) / SCAN_PERIOD;

    bar.position.y = panel.height * (0.98 - travel * 0.96);
    (bar.material as THREE.MeshBasicMaterial).opacity =
      0.5 * Math.sin(travel * Math.PI) ** 0.5;
  });

  const rows = isTouch ? TOUCH_ROWS.length : KEY_ROWS.length;

  /** Reading area of the panel, inset from its edge. */
  const margin = 0.07;
  const headerDepth = 0.19;
  const lineHeight = (panel.height - headerDepth - margin) / rows;
  /** Baseline of the first row, measured from the bottom of the panel. */
  const firstRow = panel.height - headerDepth - lineHeight / 2;

  // Three layers stacked just proud of the panel's front face, each far enough
  // clear of the last that none of them z-fight: the lit surface, then the
  // scanline and the lettering over it.
  const litFace = metres(panel.thickness / 2 + 0.004);
  const textFace = metres(panel.thickness / 2 + 0.012);

  return (
    <group ref={group} position={POSITION} rotation={[0, FACING, 0]}>
      {/* Footing. Sunk a little into the grass so it sits in the ground
          rather than balancing on it. */}
      <mesh position={[0, metres(footing.height / 2 - 0.03), 0]} material={metalMaterial}>
        <boxGeometry
          args={[metres(footing.width), metres(footing.height), metres(footing.depth)]}
        />
      </mesh>

      {/* A light in the footing, washing up the posts. */}
      <mesh
        position={[
          0,
          metres(footing.height - 0.04),
          metres(footing.depth / 2 + 0.005),
        ]}
      >
        <planeGeometry args={[metres(footing.width * 0.8), metres(0.025)]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            (side * metres(panel.width)) / 2.5,
            metres(footing.height / 2 + postHeight / 2),
            0,
          ]}
          material={darkMetalMaterial}
        >
          <boxGeometry
            args={[metres(postThickness), metres(postHeight), metres(postThickness)]}
          />
        </mesh>
      ))}

      {/*
        The panel hinges at the top of the posts and leans back from there, so
        the bottom edge stays put and only the top travels — which is what
        makes it read as a lectern rather than a board propped at an angle.
      */}
      <group
        position={[0, metres(footing.height / 2 + postHeight), 0]}
        rotation={[-tilt, 0, 0]}
      >
        <group position={[0, metres(panel.height / 2), 0]}>
          <mesh material={darkMetalMaterial}>
            <boxGeometry
              args={[
                metres(panel.width),
                metres(panel.height),
                metres(panel.thickness),
              ]}
            />
          </mesh>

          {/* The lit face of the sign. */}
          <mesh position={[0, 0, litFace]}>
            <planeGeometry
              args={[metres(panel.width - 0.05), metres(panel.height - 0.05)]}
            />
            <meshBasicMaterial
              color="#0e2a3d"
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* Everything below is positioned from the bottom edge of the panel,
            which is where the measurements above are written from. */}
        <group position={[0, 0, textFace]}>
          <mesh ref={scan}>
            <planeGeometry args={[metres(panel.width - 0.06), metres(0.03)]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={0} depthWrite={false} />
          </mesh>

          <HoloText
            position={[0, metres(panel.height - 0.08), 0]}
            size={0.082}
            color="#ffffff"
          >
            HOW TO MOVE
          </HoloText>

          <HoloText
            position={[0, metres(panel.height - 0.155), 0]}
            size={0.038}
            color="#7dd3fc"
          >
            {isTouch ? "Touch controls" : "Keyboard and mouse"}
          </HoloText>

          {isTouch
            ? TOUCH_ROWS.map((row, index) => (
                <group
                  key={row.label}
                  position={[0, metres(firstRow - index * lineHeight), 0]}
                >
                  <HoloText
                    position={[metres(-panel.width / 2 + 0.11), 0, 0]}
                    size={0.055}
                    color="#38bdf8"
                  >
                    {row.mark}
                  </HoloText>
                  <HoloText
                    position={[metres(0.06), 0, 0]}
                    size={0.04}
                    color="#e2e8f0"
                    width={panel.width * 0.78}
                  >
                    {row.label}
                  </HoloText>
                </group>
              ))
            : KEY_ROWS.map((row, index) => {
                const keys =
                  row.literal ??
                  row.keys
                    .map((name) => bindings[name]?.[0])
                    .filter(Boolean)
                    .map(describeKey)
                    .join(" ");

                return (
                  <group
                    key={row.label}
                    position={[0, metres(firstRow - index * lineHeight), 0]}
                  >
                    <HoloText
                      position={[metres(-panel.width / 4), 0, 0]}
                      size={0.04}
                      color="#38bdf8"
                      width={panel.width * 0.42}
                    >
                      {keys}
                    </HoloText>
                    <HoloText
                      position={[metres(panel.width / 5), 0, 0]}
                      size={0.038}
                      color="#e2e8f0"
                      width={panel.width * 0.5}
                    >
                      {row.label}
                    </HoloText>
                  </group>
                );
              })}
        </group>
      </group>
    </group>
  );
};

export default ControlBoard;
