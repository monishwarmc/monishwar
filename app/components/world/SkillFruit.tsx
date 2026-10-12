"use client";

import { Billboard } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { metres } from "@/app/constants/world.constants";
import { playSfx } from "../audio/sfx";
import { HoloText } from "./parts";
import { logoFor, SKILL_DOCS, SkillBranch } from "./skills";

/**
 * One branch's worth of skills, hanging as fruit.
 *
 * ## The logo is the fruit's skin, not a sticker on it
 *
 * Each ball is wrapped in its own texture from `public/skills/` — the brand's
 * colour with its mark repeated three times round the equator, so there is a
 * logo facing you from whichever side of the tree you walk to. That is why
 * every fruit is its own mesh rather than one instanced mesh per branch: the
 * whole point is that each is a different picture, and instances have to share
 * a material.
 *
 * An earlier version kept the balls instanced and put the logo in front of
 * them on a camera-facing sprite. It drew in one call per branch, but the
 * fruit was a plain coloured ball with a badge floating off it, and the badge
 * had to be nudged onto the near face every frame. Forty-two draw calls buys a
 * much better-looking tree.
 *
 * ## Why the names only appear on hover
 *
 * Writing all forty-two names in the air at once was an unreadable thicket.
 * The logo already says which skill it is at a glance, so the name is only
 * worth the space when you single one out.
 */

/** How much a fruit grows when you point at it. */
const HOVER_GROWTH = 1.4;

/** How much the logo glows: enough to read in the shade of the canopy. */
const GLOW = 0.32;
const GLOW_PICKED = 0.95;

type SkillFruitProps = {
  branch: SkillBranch;
  /** Where each fruit hangs, in world units, already dropped off its stem. */
  points: THREE.Vector3[];
  /** Radius of one fruit, in metres. */
  radius: number;
};

const SkillFruit = ({ branch, points, radius }: SkillFruitProps) => {
  const fruits = useRef<(THREE.Mesh | null)[]>([]);

  /** Which fruit the pointer is on, or null. */
  const [picked, setPicked] = useState<number | null>(null);

  const loaded = useLoader(
    THREE.TextureLoader,
    points.map((_, index) => logoFor(branch.skills[index] ?? "")),
  );

  // Colour images, not light values. Without this they render washed out.
  const skins = useMemo(() => {
    loaded.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    });

    return loaded;
  }, [loaded]);

  const ball = metres(radius);
  const geometry = useMemo(() => new THREE.SphereGeometry(ball, 24, 18), [ball]);

  const choose = (index: number | null) => {
    if (index === picked) return;
    // A soft tick when you land on one, so picking through the canopy has the
    // same feel as the rest of the interface.
    if (index !== null) playSfx("chime", 0.18);
    setPicked(index);
  };

  /**
   * A click opens the skill's documentation.
   *
   * On a pointer device hovering has already named the fruit, so the click
   * goes straight out. On a touchscreen there is no hover, so the first tap
   * names it and the second opens — which also means nobody is thrown out to
   * another site by a stray tap while steering the camera.
   */
  const follow = (index: number) => {
    if (index !== picked) {
      choose(index);
      return;
    }

    const docs = SKILL_DOCS[branch.skills[index] ?? ""];
    if (!docs) return;

    playSfx("open", 0.4);
    window.open(docs, "_blank", "noopener,noreferrer");
  };

  // A cursor set on the body outlives this component, so put it back.
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    points.forEach((point, index) => {
      const fruit = fruits.current[index];
      if (!fruit) return;

      // A different phase per fruit, taken from where it is rather than from a
      // stored random — same result, nothing to keep.
      const bob =
        Math.sin(time * 1.3 + point.x * 220 + point.z * 160) * metres(0.018);

      fruit.position.set(point.x, point.y + bob, point.z);
      fruit.scale.setScalar(index === picked ? HOVER_GROWTH : 1);
      // Turning slowly brings each of the three marks round in turn, so a
      // fruit is never stuck showing you the gap between two of them.
      fruit.rotation.y = time * 0.25 + point.x * 40;
    });
  });

  const chosen = picked !== null ? points[picked] : null;

  return (
    <group>
      {points.map((point, index) => (
        <mesh
          key={index}
          ref={(node) => {
            fruits.current[index] = node;
          }}
          geometry={geometry}
          position={point}
          onPointerOver={(event) => {
            event.stopPropagation();
            choose(index);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            choose(null);
            document.body.style.cursor = "";
          }}
          onClick={(event) => {
            event.stopPropagation();
            follow(index);
          }}
        >
          <meshStandardMaterial
            map={skins[index]}
            // The same picture again as its own light, so a logo stays
            // readable in the shade under the canopy.
            emissiveMap={skins[index]}
            emissive="#ffffff"
            emissiveIntensity={index === picked ? GLOW_PICKED : GLOW}
            roughness={0.45}
            metalness={0.05}
          />
        </mesh>
      ))}

      {/*
        The name's offset is *inside* the billboard, not in the world. The
        billboard has already turned to face you, so its local "down" is always
        down on screen, and the name lands under the fruit from every angle.
        Offsetting it in world space instead put it straight on top of the
        branch's own sign as soon as you walked round to the other side.
      */}
      {chosen && (
        <Billboard position={[chosen.x, chosen.y, chosen.z]}>
          <HoloText
            // Clear of the fruit by more than the text is tall, or the two sit
            // on top of each other.
            position={[0, -metres(1.1), 0]}
            size={0.6}
            color="#ffffff"
            onTop
          >
            {branch.skills[picked!] ?? ""}
          </HoloText>

          {SKILL_DOCS[branch.skills[picked!] ?? ""] && (
            <HoloText
              position={[0, -metres(1.65), 0]}
              size={0.3}
              color={branch.colour}
              onTop
            >
              click for the docs ↗
            </HoloText>
          )}
        </Billboard>
      )}
    </group>
  );
};

export default SkillFruit;
