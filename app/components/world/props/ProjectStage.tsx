"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { PROJECTS } from "@/app/constants/portfolio.constants";
import { metres, PROJECTS_STATION } from "@/app/constants/world.constants";
import { useSession } from "../../contexts/SessionContext";
import { playSfx } from "../../audio/sfx";
import { useInteractionState } from "../interactables";
import { HoloText, darkMetalMaterial, metalMaterial } from "../parts";
import { useInteractable } from "../useInteractable";

/**
 * THE PROJECT GALLERY.
 *
 * A curved bank of bays, one project each, that you walk along. The bay in
 * front of you is live — the real site, running in an iframe, embedded in the
 * scene — and the rest are dark panels with the project's name on them until
 * you slide to them.
 *
 * ## Only one of them is ever live
 *
 * Six iframes is six whole web applications, and one of them is itself a 3D
 * Rubik's cube rendering in its own canvas. Running all six behind a WebGL
 * scene that is already drawing a spaceship is not a trade worth making for
 * five previews nobody is looking at. So the focused bay mounts its iframe
 * and the others unmount theirs, which also means the site you are looking at
 * gets a fresh load rather than one that has been idling for ten minutes.
 *
 * ## Why `Html` and not a texture
 *
 * A live site has to be a real DOM iframe; there is no way to get one into a
 * texture without a server rendering it. drei's `Html` in `transform` mode
 * puts the DOM on a CSS3D layer positioned to match a 3D object, which is as
 * close as the web gets to a screen inside a scene. The cost is that it does
 * not occlude — the iframe draws over the top of anything between it and the
 * camera — so the bays face outward at the rim with nothing in front of them,
 * and `distanceFactor` keeps them from looming when you walk up close.
 */

/** The stage, in metres. */
const STAGE = {
  bay: { width: 6.4, height: 4.6 },
  /**
   * Metres between one bay and the next.
   *
   * The bays do *not* all stand side by side. Six bays at a readable width
   * need about forty metres of frontage, and the deck cannot give them a third
   * of that without the ends standing through the glass. So this is a
   * carousel: the focused bay is in the middle, its two neighbours flank it
   * at this pitch and scaled down, and the rest are not drawn at all.
   *
   * The first version laid them on an arc and they overlapped five deep —
   * every title written over the next one's description.
   */
  pitch: 7,
  /** How small a flanking bay gets, which is what keeps the stage compact. */
  asideScale: 0.72,
  /** Beyond this many bays from the focus, nothing is drawn. */
  visible: 1.6,
  plinth: 0.6,
  /** Height of the screen's bottom edge above the grass. */
  lift: 1.4,
  /** How far the flanking bays fall back, so the focused one reads forward. */
  depth: 2.4,
};

/** Seconds for the focus to glide from one bay to the next. */
const GLIDE = 5;

const COUNT = PROJECTS.length;


/**
 * The live site, or the panel that stands in for it.
 *
 * The iframe is sandboxed: these are the author's own projects, but an
 * embedded page that can reach into the parent document is a bad default to
 * leave lying around in a codebase, and none of them need it.
 */
const Screen = ({
  project,
  live,
  onOpen,
}: {
  project: (typeof PROJECTS)[number];
  live: boolean;
  onOpen: () => void;
}) => {
  if (!live) {
    return (
      <group>
        <mesh>
          <planeGeometry
            args={[metres(STAGE.bay.width * 0.92), metres(STAGE.bay.height * 0.88)]}
          />
          <meshStandardMaterial
            color="#0b1f2e"
            emissive="#0e3550"
            emissiveIntensity={0.5}
          />
        </mesh>

        <HoloText
          position={[0, metres(0.6), metres(0.06)]}
          size={0.62}
          color="#7dd3fc"
          width={STAGE.bay.width * 0.8}
        >
          {project.name}
        </HoloText>

        <HoloText
          position={[0, metres(-0.9), metres(0.06)]}
          size={0.34}
          color="#94a3b8"
          width={STAGE.bay.width * 0.78}
        >
          {project.description}
        </HoloText>
      </group>
    );
  }

  return (
    <Html
      transform
      occlude={false}
      // The DOM is laid out in CSS pixels and then scaled onto the plane, so
      // this is "pixels per metre" — big enough that the embedded site gets a
      // desktop viewport rather than a phone one.
      distanceFactor={metres(STAGE.bay.height) * 2.2}
      position={[0, 0, metres(0.08)]}
      style={{ pointerEvents: "auto" }}
      zIndexRange={[20, 0]}
    >
      <div
        style={{
          width: 980,
          height: 620,
          borderRadius: 14,
          overflow: "hidden",
          border: "2px solid rgba(94,234,212,0.55)",
          background: "#06111b",
          boxShadow: "0 0 60px rgba(56,189,248,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* A browser chrome strip, so it reads as a site rather than as a
            hole in the world with a website behind it. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            background: "#0b1f2e",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flex: "0 0 auto",
          }}
        >
          {["#ff5f57", "#febc2e", "#28c840"].map((colour) => (
            <span
              key={colour}
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: colour,
              }}
            />
          ))}

          <span
            style={{
              marginLeft: 8,
              flex: 1,
              fontFamily: "ui-monospace, monospace",
              fontSize: 13,
              color: "#7dd3fc",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {project.url}
          </span>

          <button
            type="button"
            onClick={onOpen}
            style={{
              border: "1px solid rgba(94,234,212,0.6)",
              background: "transparent",
              color: "#5eead4",
              borderRadius: 999,
              padding: "3px 12px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            open ↗
          </button>
        </div>

        <iframe
          src={project.url}
          title={project.name}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
          style={{ flex: 1, width: "100%", border: 0, background: "#fff" }}
        />
      </div>
    </Html>
  );
};

const ProjectStage = () => {
  const group = useRef<THREE.Group>(null);
  const bays = useRef<(THREE.Group | null)[]>([]);
  const [focus, setFocus] = useState(0);

  const { exploring } = useSession();
  const { nearest, engaged } = useInteractionState();

  /**
   * Whether the live site is mounted at all.
   *
   * Three conditions, and every one of them is load-bearing:
   *
   *   - **in explore mode**, because `Html` is a DOM layer over the canvas and
   *     does not occlude. During the intro the camera is *outside* the ship,
   *     and an un-occluded iframe cheerfully drew itself over the hull — a
   *     white rectangle floating in space next to the spaceship.
   *   - **standing at the stage**, so walking around the deck is not dragging
   *     six web applications along behind you.
   *   - **the focused bay only**, which is the whole reason the other five are
   *     panels.
   *
   * It is also why the iframe gets a fresh load each time you arrive instead
   * of one that has been idling since the page opened.
   */
  const atStage = nearest === "projects" || engaged === "projects";
  const showLive = exploring && atStage;

  /** Smoothed focus, so the bays swing rather than snap. */
  const at = useRef(0);

  const onRelease = useCallback(() => undefined, []);

  useInteractable({
    ref: group,
    id: "projects",
    label: "Projects",
    verb: "Browse",
    radius: metres(11),
    onRelease,
  });

  const move = (direction: 1 | -1) => {
    playSfx("click", 0.4);
    setFocus((current) => Math.min(COUNT - 1, Math.max(0, current + direction)));
  };

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);

    at.current += (focus - at.current) * (1 - Math.exp(-GLIDE * delta));

    bays.current.forEach((bay, index) => {
      if (!bay) return;

      const offset = index - at.current;
      const distance = Math.abs(offset);

      bay.visible = distance < STAGE.visible;
      if (!bay.visible) return;

      // The focused bay stands forward and full size; the flanking ones fall
      // back and shrink, so there is never any doubt which one is live — and
      // so the whole stage stays inside the dome.
      const lean = THREE.MathUtils.clamp(1 - distance, 0, 1);

      bay.position.x = metres(offset * STAGE.pitch);
      bay.position.z = metres(-(1 - lean) * STAGE.depth);
      bay.rotation.y = -offset * 0.42;
      bay.scale.setScalar(
        STAGE.asideScale + lean * (1 - STAGE.asideScale),
      );
    });
  });

  const current = PROJECTS[focus];

  return (
    <group
      ref={group}
      position={PROJECTS_STATION.position}
      rotation={[0, PROJECTS_STATION.facing, 0]}
    >
      {PROJECTS.map((project, index) => (
        <group
          key={project.name}
          // Position, rotation and scale are all set by the frame loop; the
          // carousel is a ring around the focus, not a fixed layout.
          ref={(node) => {
            bays.current[index] = node;
          }}
        >
          {/* The bay's own frame and footing. */}
          <mesh position={[0, metres(STAGE.plinth / 2), 0]} material={metalMaterial}>
            <boxGeometry
              args={[metres(STAGE.bay.width), metres(STAGE.plinth), metres(1.2)]}
            />
          </mesh>

          <mesh
            position={[0, metres(STAGE.lift + STAGE.bay.height / 2), metres(-0.2)]}
            material={darkMetalMaterial}
          >
            <boxGeometry
              args={[
                metres(STAGE.bay.width),
                metres(STAGE.bay.height + 1),
                metres(0.35),
              ]}
            />
          </mesh>

          <group position={[0, metres(STAGE.lift + STAGE.bay.height / 2), 0]}>
            <Screen
              project={project}
              live={showLive && index === focus}
              onOpen={() => {
                playSfx("open", 0.4);
                window.open(project.url, "_blank", "noopener,noreferrer");
              }}
            />
          </group>

          {/* The links that belong to this project, under its screen. */}
          <group position={[0, metres(STAGE.lift - 0.75), metres(0.2)]}>
            {(
              [
                ["site", project.url],
                ["code", project.git],
                ..."devpost" in project && project.devpost
                  ? ([["devpost", project.devpost]] as [string, string][])
                  : [],
              ] as [string, string][]
            ).map(([label, href], slot, all) => (
              <group
                key={label}
                position={[
                  metres((slot - (all.length - 1) / 2) * 2.9),
                  0,
                  0,
                ]}
              >
                <mesh
                  onPointerOver={() => {
                    document.body.style.cursor = "pointer";
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = "";
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    playSfx("open", 0.4);
                    window.open(href, "_blank", "noopener,noreferrer");
                  }}
                >
                  <planeGeometry args={[metres(2.6), metres(0.8)]} />
                  <meshStandardMaterial
                    color="#0e2a3d"
                    emissive="#38bdf8"
                    emissiveIntensity={0.35}
                  />
                </mesh>

                <HoloText position={[0, 0, metres(0.05)]} size={0.34} color="#7dd3fc">
                  {`${label} ↗`}
                </HoloText>
              </group>
            ))}
          </group>
        </group>
      ))}

      {/* Heading and the step controls, in front of the arc. */}
      <group position={[0, metres(STAGE.lift + STAGE.bay.height + 2.6), metres(2)]}>
        <Text
          fontSize={metres(1.5)}
          anchorX="center"
          anchorY="middle"
          renderOrder={999}
        >
          PROJECTS
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

        <HoloText position={[0, metres(-1.5), 0]} size={0.5} color="#9fb6c9" onTop>
          {`${current.name}  ·  ${focus + 1}/${COUNT}`}
        </HoloText>
      </group>

      {[-1, 1].map((direction) => (
        <mesh
          key={direction}
          position={[
            metres(direction * 6.2),
            metres(STAGE.lift + STAGE.bay.height / 2),
            metres(3),
          ]}
          rotation={[0, 0, direction > 0 ? -Math.PI / 2 : Math.PI / 2]}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
          }}
          onClick={(event) => {
            event.stopPropagation();
            move(direction > 0 ? 1 : -1);
          }}
        >
          <coneGeometry args={[metres(0.7), metres(1.3), 3]} />
          <meshStandardMaterial
            color="#7dd3fc"
            emissive="#38bdf8"
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

export default ProjectStage;
