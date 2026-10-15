"use client";

import { Billboard } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { metres } from "@/app/constants/world.constants";
import { playSfx } from "../audio/sfx";
import { openCertificate } from "./certificates";
import { HoloText } from "./parts";
import { destinationFor, logoFor, SkillBranch } from "./skills";

/**
 * One branch's worth of skills, hanging as fruit you can knock down.
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
 * ## Picking one
 *
 * Touch a fruit and it drops — off the stem, down through the canopy, a bounce
 * on the grass, and then it opens what that skill has to show for itself: the
 * certificate if there is one, the official documentation if there is not.
 *
 * The fall is not decoration. It is the gap between "I touched something" and
 * "a panel appeared", and without it the panel feels like it came from
 * nowhere. It is also why the destination fires on *landing* rather than on
 * the click: the fruit hitting the grass is the thing that caused it.
 *
 * Fruit grows back a few seconds later, because a tree that empties out as you
 * walk round it is a tree you can only read once.
 */

/** How much a fruit grows when you point at it. */
const HOVER_GROWTH = 1.4;

/** How much the logo glows: enough to read in the shade of the canopy. */
const GLOW = 0.32;
const GLOW_PICKED = 0.95;

/** Metres per second squared. Heavier than real gravity; it reads better. */
const FALL_GRAVITY = 26;

/** How much speed a fruit keeps through its one bounce. */
const BOUNCE = 0.32;

/** Seconds a fruit lies on the grass before it grows back on the branch. */
const REGROW_AFTER = 3.2;

/** Seconds between the fruit settling and the panel opening. */
const OPEN_DELAY = 0.25;

type Falling = {
  /** Metres fallen from where it hung. */
  drop: number;
  /** Downward speed, metres per second. */
  speed: number;
  /** Seconds since it first came to rest, or null while still moving. */
  resting: number | null;
  /** Whether the destination has already been opened. */
  opened: boolean;
  /** Seconds since it was picked, for the regrow timer. */
  age: number;
  spin: number;
};

type SkillFruitProps = {
  branch: SkillBranch;
  /** Where each fruit hangs, in world units, already dropped off its stem. */
  points: THREE.Vector3[];
  /** Radius of one fruit, in metres. */
  radius: number;
  /** World height of the grass, so a fruit knows when it has landed. */
  groundY: number;
};

const SkillFruit = ({ branch, points, radius, groundY }: SkillFruitProps) => {
  const fruits = useRef<(THREE.Mesh | null)[]>([]);

  /** Which fruit the pointer is on, or null. */
  const [picked, setPicked] = useState<number | null>(null);

  /**
   * The fruit currently in the air, keyed by index.
   *
   * A ref rather than state: it changes every frame while something is
   * falling, and re-rendering forty-two meshes sixty times a second to animate
   * one of them is exactly the trade this codebase avoids everywhere else.
   */
  const falling = useRef(new Map<number, Falling>());

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

  /**
   * Fruit is not a ball.
   *
   * A sphere squashed very slightly on the vertical and widened at the waist
   * reads as something that grew; a true sphere reads as a bauble. The stem
   * nub and the leaf do most of the rest of the work — see the render below.
   */
  const geometry = useMemo(() => {
    const sphere = new THREE.SphereGeometry(ball, 26, 20);
    sphere.scale(1, 0.9, 1);
    return sphere;
  }, [ball]);

  const stemGeometry = useMemo(
    () => new THREE.CylinderGeometry(ball * 0.07, ball * 0.1, ball * 0.42, 5),
    [ball],
  );

  const leafGeometry = useMemo(() => {
    const leaf = new THREE.SphereGeometry(ball * 0.34, 8, 6);
    leaf.scale(1, 0.22, 0.55);
    return leaf;
  }, [ball]);

  useEffect(
    () => () => {
      geometry.dispose();
      stemGeometry.dispose();
      leafGeometry.dispose();
    },
    [geometry, stemGeometry, leafGeometry],
  );

  const choose = (index: number | null) => {
    if (index === picked) return;
    // A soft tick when you land on one, so picking through the canopy has the
    // same feel as the rest of the interface.
    if (index !== null) playSfx("chime", 0.18);
    setPicked(index);
  };

  /**
   * Knocks a fruit off its stem.
   *
   * On a pointer device hovering has already named the fruit, so the first
   * click drops it. On a touchscreen there is no hover, so the first tap names
   * it and the second drops it — which also stops a stray tap while steering
   * the camera from throwing the player into a panel.
   */
  const knock = (index: number) => {
    if (falling.current.has(index)) return;

    if (index !== picked) {
      choose(index);
      return;
    }

    if (!destinationFor(branch.skills[index] ?? "")) return;

    playSfx("open", 0.3);

    falling.current.set(index, {
      drop: 0,
      speed: 0,
      resting: null,
      opened: false,
      age: 0,
      spin: 0,
    });
  };

  // A cursor set on the body outlives this component, so put it back.
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const time = clock.elapsedTime;

    points.forEach((point, index) => {
      const fruit = fruits.current[index];
      if (!fruit) return;

      const drop = falling.current.get(index);

      if (!drop) {
        // On the branch: a different phase per fruit, taken from where it is
        // rather than from a stored random — same result, nothing to keep.
        const bob =
          Math.sin(time * 1.3 + point.x * 220 + point.z * 160) * metres(0.018);

        fruit.visible = true;
        fruit.position.set(point.x, point.y + bob, point.z);
        fruit.scale.setScalar(index === picked ? HOVER_GROWTH : 1);
        // Turning slowly brings each of the three marks round in turn, so a
        // fruit is never stuck showing you the gap between two of them.
        fruit.rotation.set(0, time * 0.25 + point.x * 40, 0);
        return;
      }

      drop.age += delta;

      // How far it may fall before it is sitting on the grass.
      const toGround = point.y - groundY - metres(radius) * 0.9;

      if (drop.resting === null) {
        drop.speed += FALL_GRAVITY * delta;
        drop.drop += metres(drop.speed) * delta;
        drop.spin += delta * 6;

        if (drop.drop >= toGround) {
          drop.drop = toGround;

          // One bounce, then it settles. A second bounce looks like a ball.
          if (drop.speed > 2.2) {
            drop.speed = -drop.speed * BOUNCE;
            drop.drop -= 1e-5;
          } else {
            drop.speed = 0;
            drop.resting = 0;
          }
        }
      } else {
        drop.resting += delta;
        drop.spin *= 1 - Math.min(delta * 6, 1);

        if (!drop.opened && drop.resting > OPEN_DELAY) {
          drop.opened = true;
          open(branch.skills[index] ?? "");
        }
      }

      fruit.visible = drop.age < REGROW_AFTER;
      fruit.position.set(point.x, point.y - drop.drop, point.z);
      fruit.rotation.set(drop.spin * 0.7, drop.spin, drop.spin * 0.3);
      fruit.scale.setScalar(1);

      if (drop.age >= REGROW_AFTER) falling.current.delete(index);
    });
  });

  const chosen = picked !== null ? points[picked] : null;
  const destination =
    picked !== null ? destinationFor(branch.skills[picked] ?? "") : null;

  return (
    <group>
      {points.map((point, index) => (
        <group
          key={index}
          ref={(node) => {
            fruits.current[index] = node as unknown as THREE.Mesh | null;
          }}
          position={point}
        >
          <mesh
            geometry={geometry}
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
              knock(index);
            }}
          >
            <meshStandardMaterial
              map={skins[index]}
              // The same picture again as its own light, so a logo stays
              // readable in the shade under the canopy.
              emissiveMap={skins[index]}
              emissive="#ffffff"
              emissiveIntensity={index === picked ? GLOW_PICKED : GLOW}
              roughness={0.42}
              metalness={0.05}
            />
          </mesh>

          {/* The stem it hung by, and one leaf off it. Small, but they are
              most of what stops the thing reading as a Christmas bauble. */}
          <mesh geometry={stemGeometry} position={[0, ball * 0.98, 0]}>
            <meshStandardMaterial color="#6b4b2a" roughness={0.95} />
          </mesh>
          <mesh
            geometry={leafGeometry}
            position={[ball * 0.3, ball * 1.12, 0]}
            rotation={[0, 0.6, 0.45]}
          >
            <meshStandardMaterial color="#4b8a3a" roughness={0.8} />
          </mesh>
        </group>
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

          {destination && (
            <HoloText
              position={[0, -metres(1.65), 0]}
              size={0.3}
              color={branch.colour}
              onTop
            >
              {destination.kind === "certificate"
                ? "pick it — certificate below ↓"
                : "pick it — docs ↗"}
            </HoloText>
          )}
        </Billboard>
      )}
    </group>
  );
};

/**
 * What a landed fruit does.
 *
 * Certificate first: a skill that was certified should show the certificate
 * rather than somebody else's documentation. Out at module scope because the
 * frame loop calls it and it closes over nothing.
 */
const open = (skill: string) => {
  const destination = destinationFor(skill);
  if (!destination) return;

  if (destination.kind === "certificate") {
    openCertificate(destination.certificate.name);
    playSfx("chime", 0.5);
    return;
  }

  playSfx("open", 0.4);
  window.open(destination.url, "_blank", "noopener,noreferrer");
};

export default SkillFruit;
