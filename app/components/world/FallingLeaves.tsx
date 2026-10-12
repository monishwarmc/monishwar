"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { makeRandom } from "./random";
import { useSettings } from "../settings/settings";

/**
 * Blossom and leaves coming down under the tree, forever.
 *
 * ## How it works
 *
 * Every leaf is one instance of the same small mesh, so the whole fall is a
 * single draw call however many there are. Each one is described once, at
 * mount, by the `Leaf` record below — where it drifts, how fast it sinks, how
 * it spins — and then the frame loop only has to turn those numbers into a
 * matrix.
 *
 * Each leaf's life is a loop from 0 to 1, and it has two halves. The first
 * `FALLING` of it is the drop; the rest is spent lying where it landed, until
 * it fades and starts again at the top. Taking the fractional part of
 * (time x speed) means nothing is ever spawned or destroyed — a leaf that has
 * finished is already back in the canopy. Giving every leaf a different
 * starting point in that loop is what stops them coming down in sheets, and
 * what keeps a drift of them on the ground at all times.
 *
 * ## Why the CPU does this and the grass's wind does not
 *
 * GrassField animates fifty thousand blades, so it has to be the GPU — a CPU
 * pass would mean re-uploading the whole instance buffer every frame. Here
 * there are about a hundred leaves, the same upload is a few kilobytes, and
 * writing the motion as plain arithmetic rather than injected GLSL is far
 * easier to follow and to change.
 *
 * Everything in this file is in **metres**. The parent group turns metres into
 * world units, so no measurement here has to know what the world scale is.
 */

/**
 * How many leaves exist at once, by quality setting.
 *
 * Only about a third are in the air — the rest are lying on the ground — so
 * these are roughly three times what the falling effect alone would need.
 */
const COUNT: Record<string, number> = { low: 70, balanced: 160, high: 280 };

/** The fall, in metres. */
const CANOPY_TOP = 12.8;
const GROUND = 0.05;

/** Seconds for one whole cycle: the fall, and then lying there. */
const SLOWEST = 30;
const FASTEST = 18;

/**
 * How much of that cycle is spent falling, the rest lying on the ground.
 *
 * At a third, roughly two leaves out of three are down at any moment, which is
 * what makes the ground under the tree look like a tree has been standing
 * there rather than like a particle effect.
 */
const FALLING = 0.34;

/** How much of the resting half is spent fading out at the end of it. */
const FADING = 0.22;

/** Lying leaves sit a whisker above the soil so they do not z-fight with it. */
const LYING = 0.012;

/** Spring colours: mostly blossom, with new green mixed through it. */
const COLOURS = ["#f9d9e4", "#fbe3ec", "#ffffff", "#bfe3a0", "#a7d489"];

/** One leaf's whole life, decided once. */
type Leaf = {
  /** Centre of the spiral it drifts down, in metres from the trunk. */
  x: number;
  z: number;
  /** How wide that spiral is, and where in it the leaf starts. */
  radius: number;
  phase: number;
  /** Turns of the spiral over one fall. */
  swirl: number;
  /** Falls per second — the reciprocal of how long one fall takes. */
  speed: number;
  /** Where in its own fall it starts, so they do not come down in sheets. */
  offset: number;
  spin: number;
  size: number;
};

/**
 * A leaf shape, tapered to a point at both ends.
 *
 * A plain rectangle at this size reads as a speck of dirt. Pinching the ends
 * costs nothing — it is four extra rows on a plane — and is the difference
 * between confetti and blossom.
 */
const leafGeometry = (length: number) => {
  const geometry = new THREE.PlaneGeometry(length * 0.55, length, 1, 4);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    // -0.5 at one end, +0.5 at the other; widest across the middle.
    const along = position.getY(i) / length;
    position.setX(i, position.getX(i) * Math.cos(along * Math.PI));
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
};

const scratch = new THREE.Object3D();

const FallingLeaves = ({ spread }: { spread: number }) => {
  const { quality } = useSettings();
  const mesh = useRef<THREE.InstancedMesh>(null);

  const count = COUNT[quality] ?? COUNT.balanced;

  // 12cm, which is about the size of the leaves on the tree itself — they
  // grew when it did. At twice this they read as falling hands.
  const geometry = useMemo(() => leafGeometry(0.12), []);

  const material = useMemo(
    () =>
      // Per-instance colour comes from `setColorAt` below; three switches the
      // shader over on its own once an InstancedMesh has an instanceColor, so
      // `vertexColors` stays off and the geometry needs no colour attribute.
      new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    [],
  );

  const leaves = useMemo<Leaf[]>(() => {
    const random = makeRandom(20260412);

    return Array.from({ length: count }, () => {
      // sqrt keeps the scatter even across the disc instead of crowding the
      // trunk — the same trick the grass field uses.
      const distance = Math.sqrt(random()) * spread;
      const around = random() * Math.PI * 2;

      return {
        x: Math.cos(around) * distance,
        z: Math.sin(around) * distance,
        radius: 0.15 + random() * 0.5,
        phase: random() * Math.PI * 2,
        swirl: (random() < 0.5 ? -1 : 1) * (1 + random() * 2.5),
        speed: 1 / (FASTEST + random() * (SLOWEST - FASTEST)),
        offset: random(),
        spin: (random() < 0.5 ? -1 : 1) * (1.5 + random() * 3),
        size: 0.7 + random() * 0.7,
      };
    });
  }, [count, spread]);

  useFrame(({ clock }) => {
    const instanced = mesh.current;
    if (!instanced) return;

    const time = clock.elapsedTime;

    leaves.forEach((leaf, index) => {
      // 0 in the canopy, 1 at the end of its rest on the ground.
      const life = (time * leaf.speed + leaf.offset) % 1;

      // How far through the fall it is. Past 1 it has landed and stays put.
      const dropped = Math.min(life / FALLING, 1);

      // Where the spiral had carried it by the moment it touched down, so a
      // landed leaf stops drifting instead of sliding along the grass.
      const angle = leaf.phase + dropped * leaf.swirl * Math.PI * 2;

      scratch.position.set(
        leaf.x + Math.cos(angle) * leaf.radius,
        dropped < 1 ? CANOPY_TOP - dropped * (CANOPY_TOP - GROUND) : LYING,
        leaf.z + Math.sin(angle) * leaf.radius,
      );

      if (dropped < 1) {
        // Tumbling, not rolling: two axes at different rates never line up.
        scratch.rotation.set(
          dropped * leaf.spin * 9,
          angle,
          dropped * leaf.spin * 6,
        );
      } else {
        // Flat on the grass, face up, lying whichever way it happened to
        // come down.
        scratch.rotation.set(-Math.PI / 2, 0, angle);
      }

      // Fade out only at the very end of the rest, so there is always a drift
      // of them down there. Shrinking is cheaper than fading, and there is no
      // transparency sorting to get wrong.
      const resting = Math.max(0, (life - FALLING) / (1 - FALLING));
      const leaving = THREE.MathUtils.smoothstep(resting, 1 - FADING, 1);

      // Lying ones are drawn a little larger: flat on the ground and seen
      // from above they present far less of themselves than they did spinning
      // in the air.
      const settled = dropped < 1 ? 1 : 1.3;

      scratch.scale.setScalar(leaf.size * settled * (1 - leaving));

      scratch.updateMatrix();
      instanced.setMatrixAt(index, scratch.matrix);
    });

    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={(node) => {
        mesh.current = node;
        if (!node) return;

        const colour = new THREE.Color();
        leaves.forEach((_, index) => {
          colour.set(COLOURS[index % COLOURS.length]);
          node.setColorAt(index, colour);
        });

        if (node.instanceColor) node.instanceColor.needsUpdate = true;
        // The leaves move every frame and the bounding box does not follow,
        // so leave them out of the culling test entirely.
        node.frustumCulled = false;
      }}
      args={[geometry, material, count]}
      // Changing the quality setting changes the count, and an InstancedMesh
      // cannot be resized — so it is rebuilt rather than mutated.
      key={count}
    />
  );
};

export default FallingLeaves;
