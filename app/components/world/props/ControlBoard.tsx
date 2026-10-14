"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import * as THREE from "three";
import { ControlName, describeKey } from "@/app/constants/controls.constants";
import {
  BOARD,
  BOARD_FACING,
  BOARD_POSITION,
  BOARD_SCALE,
  metres,
} from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import { useSession } from "../../contexts/SessionContext";
import { useIsTouch } from "../../hooks/useIsTouch";
import { useSettings } from "../../settings/settings";
import { HoloText, darkMetalMaterial, metalMaterial } from "../parts";
import { makeRandom } from "../random";
import { useInteractable } from "../useInteractable";

/**
 * The information kiosk on the deck: a sign you walk up to and read.
 *
 * The guided tour teaches the controls once; this is the reference that stays
 * put, for anyone who skipped it or came back a week later.
 *
 * ## The display
 *
 * A line of light used to run down the face of it. It read as something
 * *falling* — which is the one thing a sign should never look like it is
 * doing — so the motion goes upward now and belongs to the frame rather than
 * the glass:
 *
 *   - the border breathes, slowly, so the thing is plainly powered
 *   - four corner brackets light in turn, clockwise, like a scanner locking on
 *   - motes drift up the face and fade out of the top
 *
 * Nothing crosses the text, which is what the falling line kept doing.
 *
 * It is device-aware: a phone has no keys to list, and a desktop has no stick.
 *
 * ## It is also the way into the guided tour
 *
 * Standing in front of it and pressing the interact key opens the tour, which
 * is the same thing the ? button in the HUD does. A visitor who skipped the
 * tour on the way in, or ticked "do not show this again" a month ago, now has
 * somewhere obvious to go and get it back — and the board is the object they
 * would walk to anyway, since it is already the thing with the controls on it.
 *
 * Where it stands and how big it is are both in `world.constants`, because the
 * collider in `physics/WorldColliders` is sized from the same numbers.
 */

/**
 * Every bare measurement below is in metres at the size the board was drawn
 * at, so each one is multiplied by this to arrive at the size it is now. See
 * BOARD_SCALE in world.constants for why it is one factor and not a redraw.
 */
const trim = (value: number) => metres(value * BOARD_SCALE);

/** Seconds for the corner brackets to go once round. */
const SCAN_PERIOD = 3.2;

/** Seconds for one mote to drift from the bottom of the face to the top. */
const MOTE_RISE = 5.5;
const MOTE_COUNT = 14;

/** Per-frame scratch — see the note in CharacterController. */
const scratch = new THREE.Object3D();

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
  const { setOverlay } = useSession();

  const group = useRef<THREE.Group>(null);
  const frame = useRef<THREE.MeshBasicMaterial>(null);
  const corners = useRef<(THREE.Mesh | null)[]>([]);
  const motes = useRef<THREE.InstancedMesh>(null);

  const { footing, postHeight, postThickness, panel, tilt } = BOARD;

  /**
   * Opening the tour, and then refusing the engagement.
   *
   * Returning false is what stops the board becoming the "engaged"
   * interactable. Nothing is being held here the way the sofa holds the avatar
   * sitting on it — the key press opens a panel and is done — and an
   * engagement that is never released would leave a live "stand up" prompt
   * behind the overlay.
   */
  const onEngage = useCallback(() => {
    playSfx("open", 0.5);
    setOverlay("guide");
    return false;
  }, [setOverlay]);

  useInteractable({
    ref: group,
    id: "controlBoard",
    label: "Controls",
    verb: "Read",
    // Generous, because the board is now big enough to read from well back
    // and nobody should have to walk into it to get the prompt.
    radius: metres(4),
    onEngage,
  });

  /** Each mote's lane across the face and where it is in its own climb. */
  const lanes = useMemo(() => {
    const random = makeRandom(4242);

    return Array.from({ length: MOTE_COUNT }, () => ({
      x: (random() - 0.5) * (panel.width - 0.2 * BOARD_SCALE),
      offset: random(),
      speed: 0.7 + random() * 0.6,
      size: 0.5 + random() * 0.8,
    }));
  }, [panel.width]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    // The border breathes, so the thing is plainly powered even from across
    // the deck where the text is too small to read.
    if (frame.current) {
      frame.current.opacity = 0.45 + Math.sin(time * 1.1) * 0.18;
    }

    // Corner brackets light in turn, clockwise: a scanner locking on.
    const lit = Math.floor((time / SCAN_PERIOD) * 4) % 4;

    corners.current.forEach((corner, index) => {
      if (!corner) return;

      const material = corner.material as THREE.MeshBasicMaterial;
      material.opacity = index === lit ? 0.95 : 0.22;
    });

    // Motes drift up the face and fade out of the top. Upward, deliberately:
    // see the note at the top of the file.
    const mote = motes.current;
    if (!mote) return;

    lanes.forEach((lane, index) => {
      const climb = ((time * lane.speed) / MOTE_RISE + lane.offset) % 1;

      scratch.position.set(
        metres(lane.x),
        trim(0.08) + climb * (metres(panel.height) - trim(0.16)),
        0,
      );
      // Thinning out as they go, rather than blinking off at the top.
      scratch.scale.setScalar(lane.size * (1 - climb) ** 0.7);
      scratch.updateMatrix();
      mote.setMatrixAt(index, scratch.matrix);
    });

    mote.instanceMatrix.needsUpdate = true;
  });

  const rows = isTouch ? TOUCH_ROWS.length : KEY_ROWS.length;

  /** Reading area of the panel, inset from its edge. */
  const margin = 0.1 * BOARD_SCALE;
  const headerDepth = 0.3 * BOARD_SCALE;
  const lineHeight = (panel.height - headerDepth - margin) / rows;
  /** Baseline of the first row, measured from the bottom of the panel. */
  const firstRow = panel.height - headerDepth - lineHeight / 2;

  // Three layers stacked just proud of the panel's front face, each far enough
  // clear of the last that none of them z-fight: the lit surface, then the
  // scanline and the lettering over it.
  const litFace = metres(panel.thickness / 2) + trim(0.004);
  const textFace = metres(panel.thickness / 2) + trim(0.012);

  return (
    <group ref={group} position={BOARD_POSITION} rotation={[0, BOARD_FACING, 0]}>
      {/* Footing. Sunk a little into the grass so it sits in the ground
          rather than balancing on it. */}
      <mesh
        position={[0, metres(footing.height / 2) - trim(0.03), 0]}
        material={metalMaterial}
      >
        <boxGeometry
          args={[
            metres(footing.width),
            metres(footing.height),
            metres(footing.depth),
          ]}
        />
      </mesh>

      {/* A light in the footing, washing up the posts. */}
      <mesh
        position={[
          0,
          metres(footing.height) - trim(0.04),
          metres(footing.depth / 2) + trim(0.005),
        ]}
      >
        <planeGeometry args={[metres(footing.width * 0.8), trim(0.025)]} />
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
            args={[
              metres(postThickness),
              metres(postHeight),
              metres(postThickness),
            ]}
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
              args={[
                metres(panel.width) - trim(0.05),
                metres(panel.height) - trim(0.05),
              ]}
            />
            <meshBasicMaterial
              color="#0e2a3d"
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* The breathing border. Four bars rather than an outlined plane,
              so the corners meet cleanly at any thickness. */}
          {(() => {
            const inset = 0.02 * BOARD_SCALE;
            const bar = 0.025 * BOARD_SCALE;

            return [
              [0, panel.height / 2 - inset, panel.width, bar],
              [0, -panel.height / 2 + inset, panel.width, bar],
              [-panel.width / 2 + inset, 0, bar, panel.height],
              [panel.width / 2 - inset, 0, bar, panel.height],
            ];
          })().map(([x, y, w, h], index) => (
            <mesh key={index} position={[metres(x), metres(y), litFace]}>
              <planeGeometry args={[metres(w), metres(h)]} />
              {index === 0 ? (
                <meshBasicMaterial
                  ref={frame}
                  color="#5eead4"
                  transparent
                  opacity={0.5}
                  depthWrite={false}
                />
              ) : (
                <meshBasicMaterial
                  color="#5eead4"
                  transparent
                  opacity={0.5}
                  depthWrite={false}
                />
              )}
            </mesh>
          ))}

          {/* Corner brackets, lighting in turn. Clockwise from top-left. */}
          {[
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1],
          ].map(([sx, sy], index) => (
            <mesh
              key={index}
              ref={(node) => {
                corners.current[index] = node;
              }}
              position={[
                sx * (metres(panel.width / 2) - trim(0.1)),
                sy * (metres(panel.height / 2) - trim(0.1)),
                litFace,
              ]}
            >
              <ringGeometry args={[trim(0.05), trim(0.075), 12]} />
              <meshBasicMaterial
                color="#7dd3fc"
                transparent
                opacity={0.22}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>

        {/* Everything below is positioned from the bottom edge of the panel,
            which is where the measurements above are written from. */}
        <group position={[0, 0, textFace]}>
          {/* Motes drifting up the face. One instanced mesh, because they are
              all the same speck. */}
          <instancedMesh
            ref={motes}
            args={[undefined, undefined, MOTE_COUNT]}
            frustumCulled={false}
          >
            <circleGeometry args={[trim(0.012), 8]} />
            <meshBasicMaterial
              color="#7dd3fc"
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </instancedMesh>

          <HoloText
            position={[0, metres(panel.height) - trim(0.12), 0]}
            size={0.125 * BOARD_SCALE}
            color="#ffffff"
          >
            HOW TO MOVE
          </HoloText>

          <HoloText
            position={[0, metres(panel.height) - trim(0.235), 0]}
            size={0.058 * BOARD_SCALE}
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
                    position={[-metres(panel.width / 2) + trim(0.17), 0, 0]}
                    size={0.078 * BOARD_SCALE}
                    color="#38bdf8"
                  >
                    {row.mark}
                  </HoloText>
                  <HoloText
                    position={[trim(0.1), 0, 0]}
                    size={0.056 * BOARD_SCALE}
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
                      size={0.056 * BOARD_SCALE}
                      color="#38bdf8"
                      width={panel.width * 0.42}
                    >
                      {keys}
                    </HoloText>
                    <HoloText
                      position={[metres(panel.width / 5), 0, 0]}
                      size={0.054 * BOARD_SCALE}
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
