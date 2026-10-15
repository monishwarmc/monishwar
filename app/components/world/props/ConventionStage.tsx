"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PROJECTS } from "@/app/constants/portfolio.constants";
import {
  metres,
  PROJECTS_STATION,
  STAGE_DECK,
  STAGE_RIG,
} from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import { HoloText, darkMetalMaterial, metalMaterial } from "../parts";
import { useInteractable } from "../useInteractable";

/**
 * THE KEYNOTE STAGE.
 *
 * A convention-hall stage: a low black riser, a wall-sized LED panel behind
 * it, a lighting truss overhead and line-array speakers either side. The
 * project's own site runs on the panel.
 *
 * It replaced a literal big top, which was the wrong read — a circus *tent*
 * says novelty, and these are production applications. What was worth keeping
 * from it is the staging: a raised platform you can walk onto, a screen that
 * dominates, and lights pointed at it.
 *
 * ## The screen is the screen
 *
 * `Html` in transform mode lays the DOM out in CSS pixels and puts it on a
 * CSS3D layer. Scale it with `distanceFactor` and the browser chrome floats
 * at some size of its own, in front of the panel, plainly not part of it.
 *
 * So there is no `distanceFactor` here. The div is a fixed pixel size and the
 * group is scaled by `metres(width) / PIXELS` — one CSS pixel maps to one
 * known fraction of a world unit, and the DOM lands exactly on the quad it is
 * supposed to be the face of. Change the panel's size in metres and the
 * mapping follows; change the pixel size and the site gets a different
 * viewport at the same physical size.
 */

/**
 * Pixel size of the embedded browser. Its viewport, not its scale.
 *
 * The aspect has to match the panel's, or the page is stretched: 1280/732 is
 * 1.749 against the panel's 15.4/8.8 = 1.750.
 */
const SCREEN_PIXELS = { width: 1280, height: 732 };

/**
 * CSS pixels drei puts in one world unit, in `transform` mode.
 *
 * Straight out of its source: the inner element's transform is built with
 * `getObjectCSSMatrix(matrix, 1 / ((distanceFactor || 10) / 400))`, so with no
 * `distanceFactor` the factor is 400/10 = 40.
 *
 * This number is the whole reason the first attempt failed. Scaling by
 * `metres(width) / pixels` looks like the obvious mapping and is wrong by
 * exactly this factor — the iframe rendered at 1/40 size, as a thumbnail of a
 * browser window floating near the top of the panel. Nothing errored; it just
 * came out tiny.
 */
const CSS_PX_PER_UNIT = 40;

/** Seconds for the panel to cut from one project to the next. */
const TURN = 0.4;

const COUNT = PROJECTS.length;

const Screen = ({
  project,
  live,
}: {
  project: (typeof PROJECTS)[number];
  live: boolean;
}) => {
  /**
   * The scale that pins the DOM to the panel.
   *
   * The div is `SCREEN_PIXELS.width` across and drei lays out 40 CSS pixels
   * per world unit, so the div covers `pixels / 40` world units at scale 1.
   * Scaling by the ratio of what we want to that makes it exactly as wide as
   * the panel.
   */
  const scale =
    (metres(STAGE_RIG.screen.width) * CSS_PX_PER_UNIT) / SCREEN_PIXELS.width;

  if (!live) {
    return (
      <group>
        <mesh>
          <planeGeometry
            args={[
              metres(STAGE_RIG.screen.width),
              metres(STAGE_RIG.screen.height),
            ]}
          />
          <meshStandardMaterial
            color="#060d14"
            emissive="#0d3147"
            emissiveIntensity={0.5}
          />
        </mesh>

        <HoloText
          position={[0, metres(1.1), metres(0.06)]}
          size={0.95}
          color="#7dd3fc"
          width={STAGE_RIG.screen.width * 0.86}
        >
          {project.name}
        </HoloText>

        <HoloText
          position={[0, metres(-0.9), metres(0.06)]}
          size={0.4}
          color="#94a3b8"
          width={STAGE_RIG.screen.width * 0.8}
        >
          {project.description}
        </HoloText>

        <HoloText
          position={[0, metres(-2.4), metres(0.06)]}
          size={0.32}
          color="#5eead4"
        >
          walk up to load it
        </HoloText>
      </group>
    );
  }

  return (
    <Html
      transform
      /*
       * `occlude` is what stops the page drawing over the world.
       *
       * `Html` puts real DOM on a CSS3D layer composited *over* the canvas,
       * so by default it is painted on top of everything regardless of what
       * is in front of it — walk round the back of the stage and the website
       * is still there, hanging in the air over the tree.
       *
       * "blending" has drei write an occlusion plane into the depth buffer at
       * the panel's position and hide the DOM when geometry covers it, which
       * is as close to real occlusion as a DOM overlay gets.
       */
      occlude="blending"
      // No distanceFactor: the scale below is what pins the DOM to the panel.
      scale={scale}
      position={[0, 0, metres(0.05)]}
      // The preview is a real iframe. Its own wheel and touch gestures should
      // scroll the project page; FollowCamera ignores events on this surface.
      wrapperClass="stage-screen"
      pointerEvents="auto"
      zIndexRange={[20, 0]}
    >
      <div
        data-project-screen
        style={{
          width: SCREEN_PIXELS.width,
          height: SCREEN_PIXELS.height,
          overflow: "hidden",
          background: "#050b11",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 18px",
            background: "#0b1722",
            borderBottom: "1px solid rgba(94,234,212,0.25)",
            flex: "0 0 auto",
          }}
        >
          {["#ff5f57", "#febc2e", "#28c840"].map((colour) => (
            <span
              key={colour}
              style={{ width: 13, height: 13, borderRadius: "50%", background: colour }}
            />
          ))}
          <span
            style={{
              marginLeft: 10,
              flex: 1,
              fontFamily: "ui-monospace, monospace",
              fontSize: 16,
              color: "#7dd3fc",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {project.url}
          </span>
        </div>

        <iframe
          className="project-preview-frame"
          src={project.url}
          title={project.name}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
          style={{
            flex: 1,
            width: "100%",
            border: 0,
            background: "#fff",
            touchAction: "auto",
          }}
        />
      </div>
    </Html>
  );
};

const ConventionStage = () => {
  const group = useRef<THREE.Group>(null);
  const wash = useRef<(THREE.Mesh | null)[]>([]);
  const [focus, setFocus] = useState(0);
  const [showing, setShowing] = useState(0);


  const turning = useRef(0);
  const shown = useRef(0);

  /*
   * The focused project is always live.
   *
   * It used to mount only while you were standing at the stage, to save
   * running a web application nobody was looking at. In practice that meant
   * walking up to a dark panel and waiting for it, and walking away mid-read
   * killed it. One iframe is a cost worth paying for a screen that is simply
   * on, the way a screen in a hall would be.
   *
   * Still only ever *one*: the other five are panels until you step to them.
   */
  const live = true;

  useInteractable({
    ref: group,
    id: "projects",
    label: "Projects",
    verb: "Browse",
    /*
     * Tight enough that you have to walk to it.
     *
     * This was 13m, which reaches back to the spawn mark — so the stage
     * claimed the player the instant explore mode started, its prompt masked
     * every other station, and the iframe mounted before anybody had taken a
     * step. An interact radius is a doorway, not a catchment area.
     */
    radius: metres(9),
  });

  const move = (direction: 1 | -1) => {
    playSfx("click", 0.45);
    setFocus((current) => (current + direction + COUNT) % COUNT);
    turning.current = 1e-4;
  };

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const time = clock.elapsedTime;

    if (turning.current > 0) {
      turning.current += delta / TURN;

      if (turning.current >= 0.5 && shown.current !== focus) {
        shown.current = focus;
        setShowing(focus);
        playSfx("open", 0.3);
      }

      if (turning.current >= 1) turning.current = 0;
    }

    // House lights breathe very slightly, so the rig is plainly powered.
    wash.current.forEach((lamp, i) => {
      if (!lamp) return;
      const material = lamp.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 1.6 + Math.sin(time * 1.1 + i) * 0.35;
    });
  });

  const project = PROJECTS[showing];

  const links = useMemo(() => {
    const out: [string, string][] = [
      ["visit site", project.url],
      ["source", project.git],
    ];
    if ("devpost" in project && project.devpost) out.push(["devpost", project.devpost]);
    return out;
  }, [project]);

  const { riser, screen, truss } = STAGE_RIG;
  const screenMid = STAGE_DECK.height + screen.lift + screen.height / 2;

  return (
    <group
      ref={group}
      position={PROJECTS_STATION.position}
      rotation={[0, PROJECTS_STATION.facing, 0]}
    >
      {/* ------------------------------------------------------- riser --- */}

      <mesh position={[0, metres(STAGE_DECK.height / 2), 0]} receiveShadow>
        <boxGeometry
          args={[metres(riser.width), metres(STAGE_DECK.height), metres(riser.depth)]}
        />
        <meshStandardMaterial color="#13181f" roughness={0.55} metalness={0.25} />
      </mesh>

      {/* A lit nosing along the front edge, as every real stage has. */}
      <mesh
        position={[0, metres(STAGE_DECK.height - 0.07), metres(riser.depth / 2 + 0.02)]}
      >
        <boxGeometry args={[metres(riser.width), metres(0.1), metres(0.06)]} />
        <meshBasicMaterial color="#5eead4" />
      </mesh>

      {/*
        Steps up at the front.

        Three treads cut as a proper flight: each one sits *on the ground* and
        rises to its own tread height, so the stack reads as solid stair
        rather than as slabs hovering at different heights, which is what two
        centred boxes at fractional heights looked like.

        They are wide and shallow because Rapier's autostep carries the avatar
        up anything under a third of its height anyway — these are there to
        say "you can get up here", not to be climbed one at a time.
      */}
      {[0, 1, 2].map((tier) => {
        const rise = (STAGE_DECK.height * (tier + 1)) / 3;

        return (
          <mesh
            key={tier}
            position={[
              0,
              metres(rise / 2),
              metres(riser.depth / 2 + 1.95 - tier * 0.65),
            ]}
          >
            <boxGeometry args={[metres(7.5), metres(rise), metres(0.68)]} />
            <meshStandardMaterial color="#1b222b" roughness={0.6} metalness={0.3} />
          </mesh>
        );
      })}

      {/* A lit strip on the leading edge of the bottom tread. */}
      <mesh position={[0, metres(0.03), metres(riser.depth / 2 + 2.28)]}>
        <boxGeometry args={[metres(7.5), metres(0.06), metres(0.05)]} />
        <meshBasicMaterial color="#5eead4" />
      </mesh>

      {/* ------------------------------------------------- the LED wall --- */}

      <group position={[0, metres(screenMid), metres(-riser.depth / 2 + 0.6)]}>
        {/* Bezel. The panel sits in it rather than floating in front. */}
        <mesh position={[0, 0, metres(-0.3)]} material={darkMetalMaterial}>
          <boxGeometry
            args={[
              metres(screen.width + screen.bezel * 2),
              metres(screen.height + screen.bezel * 2),
              metres(0.6),
            ]}
          />
        </mesh>

        {/* A thin lit rim round the panel. */}
        <mesh position={[0, 0, metres(0.01)]}>
          <planeGeometry
            args={[
              metres(screen.width + screen.bezel),
              metres(screen.height + screen.bezel),
            ]}
          />
          <meshBasicMaterial color="#0f3b52" />
        </mesh>

        <Screen project={project} live={live} />
      </group>

      {/* ------------------------------------------------------- truss --- */}

      <group position={[0, metres(truss.height), metres(-riser.depth / 2 + 1.2)]}>
        {/* Two chords and the zig-zag between them: a box truss, cheaply. */}
        {[-1, 1].map((chord) => (
          <mesh
            key={chord}
            position={[0, metres(chord * 0.3), 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={metalMaterial}
          >
            <cylinderGeometry
              args={[metres(0.09), metres(0.09), metres(truss.span), 8]}
            />
          </mesh>
        ))}

        {Array.from({ length: 16 }, (_, i) => (
          <mesh
            key={i}
            position={[metres(-truss.span / 2 + (i + 0.5) * (truss.span / 16)), 0, 0]}
            rotation={[0, 0, i % 2 ? 0.7 : -0.7]}
            material={metalMaterial}
          >
            <cylinderGeometry args={[metres(0.045), metres(0.045), metres(0.85), 6]} />
          </mesh>
        ))}

        {/* Spotlights, aimed down at the stage. */}
        {Array.from({ length: 5 }, (_, i) => {
          const x = (i - 2) * (truss.span / 5.6);
          return (
            <group key={i} position={[metres(x), metres(-0.55), 0]} rotation={[0.5, 0, 0]}>
              <mesh material={darkMetalMaterial}>
                <cylinderGeometry args={[metres(0.3), metres(0.22), metres(0.8), 10]} />
              </mesh>
              <mesh
                ref={(node) => {
                  wash.current[i] = node;
                }}
                position={[0, metres(-0.42), 0]}
              >
                <circleGeometry args={[metres(0.28), 12]} />
                <meshStandardMaterial
                  color="#fff4d6"
                  emissive="#ffd27a"
                  emissiveIntensity={1.8}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ---------------------------------------------------- speakers --- */}

      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[
            metres(side * (riser.width / 2 - 1.2)),
            metres(STAGE_DECK.height),
            metres(-riser.depth / 2 + 2.2),
          ]}
        >
          {Array.from({ length: 4 }, (_, box) => (
            <mesh
              key={box}
              position={[0, metres(1.1 + box * 1.25), 0]}
              rotation={[0, 0, side * 0.05]}
              material={darkMetalMaterial}
            >
              <boxGeometry args={[metres(1.3), metres(1.15), metres(1.1)]} />
            </mesh>
          ))}
          <mesh position={[0, metres(0.4), 0]} material={metalMaterial}>
            <boxGeometry args={[metres(1.5), metres(0.8), metres(1.3)]} />
          </mesh>
        </group>
      ))}

      {/* ------------------------------------------------- the signage --- */}

      <group position={[0, metres(truss.height + 1.6), metres(-riser.depth / 2 + 1.2)]}>
        <Text fontSize={metres(1.5)} anchorX="center" anchorY="middle">
          PROJECTS
          <meshStandardMaterial
            color="#eafff8"
            emissive="#5eead4"
            emissiveIntensity={2.3}
            toneMapped={false}
            transparent
          />
        </Text>
      </group>

      {/* Caption and links, on the riser deck under the screen. */}
      <group
        position={[
          0,
          metres(STAGE_DECK.height + screen.lift - 1.15),
          metres(-riser.depth / 2 + 1.1),
        ]}
      >
        <HoloText size={0.52} color="#e2e8f0" width={screen.width * 0.8}>
          {`${project.name}  ·  ${showing + 1}/${COUNT}`}
        </HoloText>
      </group>

      <group
        position={[0, metres(STAGE_DECK.height + 1.1), metres(riser.depth / 2 - 1.6)]}
      >
        {links.map(([label, href], slot) => (
          <group
            key={label}
            position={[metres((slot - (links.length - 1) / 2) * 3.4), 0, 0]}
            rotation={[-0.35, 0, 0]}
          >
            <mesh
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
                playSfx("chime", 0.12);
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
              <planeGeometry args={[metres(3.1), metres(0.95)]} />
              <meshStandardMaterial
                color="#0e2a3d"
                emissive="#38bdf8"
                emissiveIntensity={0.5}
              />
            </mesh>
            <HoloText position={[0, 0, metres(0.05)]} size={0.34} color="#7dd3fc">
              {`${label} ↗`}
            </HoloText>
          </group>
        ))}
      </group>

      {/* Step buttons, on the deck either side of the screen. */}
      {[-1, 1].map((direction) => (
        <mesh
          key={direction}
          position={[
            metres(direction * (screen.width / 2 + 1.6)),
            metres(screenMid - screen.height / 4),
            metres(-riser.depth / 2 + 1.2),
          ]}
          rotation={[0, 0, direction > 0 ? -Math.PI / 2 : Math.PI / 2]}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
            playSfx("chime", 0.12);
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
          }}
          onClick={(event) => {
            event.stopPropagation();
            move(direction > 0 ? 1 : -1);
          }}
        >
          <coneGeometry args={[metres(0.72), metres(1.4), 3]} />
          <meshStandardMaterial
            color="#aefff2"
            emissive="#5eead4"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

export default ConventionStage;
