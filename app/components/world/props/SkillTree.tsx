"use client";

import { Billboard, Text, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  DECK,
  metres,
  TREE_FIT,
  TREE_HEIGHT,
  TREE_MODEL,
  TREE_STATION,
} from "@/app/constants/world.constants";
import { MODEL_URLS } from "@/app/constants/models.generated";
import AmbientLoop from "../../audio/AmbientLoop";
import FallingLeaves from "../FallingLeaves";
import SkillFruit from "../SkillFruit";
import { HoloText } from "../parts";
import { SKILL_BRANCHES } from "../skills";
import { useInteractable } from "../useInteractable";

/**
 * The skill tree: the CV growing on an actual tree.
 *
 * `tree.glb` is laid out in a way that makes this possible — a `trunk`, five
 * separate `branches` meshes and sixteen `leaves` clusters, each its own mesh
 * with its geometry baked in model space and no node transforms at all. So:
 *
 *   - the five branches become the five skill groups in `world/skills.ts`
 *   - each skill hangs off its branch as a fruit, on a stem
 *   - the leaves and branches bend in the wind, in the vertex shader
 *   - blossom comes down underneath, forever (see FallingLeaves)
 *
 * ## Two coordinate spaces, kept apart
 *
 * The model is 7.4 units tall and is scaled to stand TREE_HEIGHT metres. That
 * means two different units are in play, so they get two different groups and
 * never mix:
 *
 *   model units — the GLB itself, scaled by `metres(TREE_FIT)`
 *   metres      — everything added here, scaled by `metres(1)`
 *
 * `toMetres` below is the one crossing between them: it takes a point off the
 * branch geometry and gives back where that point is in metres from the foot
 * of the trunk.
 */

/** How many fruit a branch can carry before they start to crowd. */
const MAX_PER_BRANCH = 16;

/**
 * Fruit, in metres.
 *
 * A half-metre ball — absurd for fruit, but the logo wrapped round it has to
 * be readable from the ground of a fourteen-metre tree, and that is what it
 * is for.
 */
const FRUIT_RADIUS = 0.25;
/** How far below the branch a fruit hangs, on its stem. */
const STEM = 0.45;
/** No two fruit on a branch come closer than this. */
const FRUIT_GAP = 1.05;

/** How far the rustle carries at full volume, in world units. */
const RUSTLE_RANGE = 0.3;

/** How far the wind pushes the tips, in model units. */
const LEAF_SWAY = 0.1;
const BRANCH_SWAY = 0.035;

/**
 * Leaf cards are cut out with an alpha channel. The export asks for BLEND,
 * which has to sort every cluster back to front and still gets it wrong where
 * they overlap — which, in a canopy, is everywhere. Cutting them out with an
 * alpha test instead writes depth normally and sorts itself for free.
 */
const LEAF_ALPHA_TEST = 0.4;

/**
 * Bends a tree material in the wind.
 *
 * The sway is a travelling wave, like the grass, but weighted by how far the
 * vertex is from the trunk rather than how high up the blade it is: the foot
 * of the trunk is nailed down, and the further out along a branch a point sits
 * the more it moves. Two sine waves at unrelated rates keep it from looking
 * like a metronome.
 */
const addWind = (
  material: THREE.Material,
  uniforms: { uTime: { value: number } },
  amount: number,
) => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n uniform float uTime;`)
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vec2 fromTrunk = vec2(
           transformed.x - ${TREE_MODEL.trunk.x.toFixed(4)},
           transformed.z - ${TREE_MODEL.trunk.z.toFixed(4)}
         );
         float lift = max(transformed.y - ${TREE_MODEL.ground.toFixed(4)}, 0.0);
         // Roughly 0 at the foot of the trunk, roughly 2 at the outermost leaf.
         float flex = length(fromTrunk) / ${TREE_MODEL.canopyRadius.toFixed(2)}
                    + lift / ${(TREE_MODEL.crown - TREE_MODEL.ground).toFixed(2)};
         float phase = transformed.x * 0.7 + transformed.z * 0.5;
         float gust = sin(uTime * 0.9 + phase)
                    + 0.45 * sin(uTime * 2.3 + phase * 1.7);
         transformed.x += gust * flex * ${amount.toFixed(4)};
         transformed.z += gust * flex * ${(amount * 0.55).toFixed(4)};`,
      );
  };

  material.needsUpdate = true;
};

/**
 * Every vertex of a branch, outermost first.
 *
 * "Outermost" means furthest from the trunk, measured flat — which, on a
 * branch, is the same as furthest along it. Both the fruit and the branch's
 * own sign are placed off this one ranking.
 */
const rankedVertices = (branch: THREE.Mesh) => {
  const position = branch.geometry.attributes.position;
  const ranked: { point: THREE.Vector3; reach: number }[] = [];

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);

    ranked.push({
      point: new THREE.Vector3(x, position.getY(i), z),
      reach: Math.hypot(x - TREE_MODEL.trunk.x, z - TREE_MODEL.trunk.z),
    });
  }

  return ranked.sort((a, b) => b.reach - a.reach);
};

/**
 * Picks the spots on a branch where fruit will hang.
 *
 * It uses the branch's own vertices rather than guessing from a bounding box,
 * so every fruit genuinely sits on the wood. The inner half is dropped — fruit
 * grows at the ends, not against the trunk — and then they are taken in order,
 * skipping any that would land on top of one already chosen.
 *
 * Deterministic on purpose: the same tree every reload, no seeded random
 * needed, because the vertex order in the file never changes.
 */
const hangingPoints = (ranked: { point: THREE.Vector3 }[], wanted: number) => {
  const outer = ranked.slice(0, Math.ceil(ranked.length * 0.5));

  // Spread them out, loosening the rule if the branch is too small to hold
  // `wanted` fruit at arm's length from each other.
  const gapInModelUnits = FRUIT_GAP / TREE_FIT;

  for (let attempt = 0; attempt < 6; attempt++) {
    const gap = gapInModelUnits * 0.75 ** attempt;
    const picked: THREE.Vector3[] = [];

    for (const { point } of outer) {
      if (picked.every((taken) => taken.distanceTo(point) > gap)) {
        picked.push(point);
      }
      if (picked.length === wanted) return picked;
    }

    if (attempt === 5) return picked;
  }

  return [];
};

/**
 * Two conversions, used in this order: work a position out in metres, where
 * the numbers mean something to a human, then put it into world units at the
 * last moment.
 *
 * Doing the second step here rather than with a scaled group is deliberate.
 * `HoloText` already takes its size in metres and converts internally, so a
 * group that scaled metres to world units would convert every label twice —
 * which it did, and shrank them to under a millimetre.
 */
const inWorld = (point: THREE.Vector3) =>
  new THREE.Vector3(metres(point.x), metres(point.y), metres(point.z));

/** A point on the model, as metres from the foot of the trunk. */
const toMetres = (point: THREE.Vector3) =>
  new THREE.Vector3(
    (point.x - TREE_MODEL.trunk.x) * TREE_FIT,
    (point.y - TREE_MODEL.ground) * TREE_FIT,
    (point.z - TREE_MODEL.trunk.z) * TREE_FIT,
  );

const SkillTree = () => {
  const { scene } = useGLTF(MODEL_URLS.tree);

  const group = useRef<THREE.Group>(null);
  const uniforms = useRef({ uTime: { value: 0 } });

  /**
   * The tree is cloned and its materials replaced with copies, because
   * `useGLTF` caches by URL: patching the originals would leak the wind shader
   * into anything else that ever loads this file.
   */
  const { tree, windy } = useMemo(() => {
    const root = scene.clone(true);
    const copies = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    const moving: { material: THREE.Material; amount: number }[] = [];

    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.castShadow = true;
      object.receiveShadow = true;

      const original = object.material as THREE.MeshStandardMaterial;
      let copy = copies.get(original);

      if (!copy) {
        copy = original.clone();

        const isLeaf = original.name === "leaves";
        if (isLeaf) {
          copy.transparent = false;
          copy.alphaTest = LEAF_ALPHA_TEST;
          copy.depthWrite = true;
        }

        // The trunk is the one part that does not move.
        if (original.name !== "bottom") {
          moving.push({
            material: copy,
            amount: isLeaf ? LEAF_SWAY : BRANCH_SWAY,
          });
        }

        copies.set(original, copy);
      }

      object.material = copy;
    });

    return { tree: root, windy: moving };
  }, [scene]);

  /**
   * The wind is hooked up here rather than up in the memo because it needs the
   * uniform the frame loop writes to — and reading a ref while rendering is
   * precisely what React's rules forbid.
   */
  useEffect(() => {
    windy.forEach(({ material, amount }) =>
      addWind(material, uniforms.current, amount),
    );
  }, [windy]);

  /** The five branch meshes, in file order, which is the order skills use. */
  const branches = useMemo(() => {
    const found: THREE.Mesh[] = [];

    tree.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name.startsWith("branches")) {
        found.push(object);
      }
    });

    return found.sort((a, b) => a.name.localeCompare(b.name));
  }, [tree]);

  /**
   * What grows on each branch: where its fruit hangs, and where its own name
   * is pinned.
   *
   * Everything is worked out in metres from the foot of the trunk, because
   * that is the only way the numbers above mean anything, and converted to
   * world units at the very end.
   */
  const crops = useMemo(
    () =>
      SKILL_BRANCHES.map((branch, index) => {
        const mesh = branches[index % Math.max(branches.length, 1)];

        if (!mesh) {
          return {
            branch,
            points: [] as THREE.Vector3[],
            sign: new THREE.Vector3(),
          };
        }

        const ranked = rankedVertices(mesh);
        const wanted = Math.min(branch.skills.length, MAX_PER_BRANCH);

        const points = hangingPoints(ranked, wanted)
          .map(toMetres)
          // Drop each one onto the end of its stem once, here, instead of on
          // every frame in two different places.
          .map((point) => point.setY(point.y - STEM));

        // The branch wears its name about two thirds of the way out, sitting
        // just above the wood — not floating off in the sky where it could
        // belong to any branch at all.
        // Near the end of the branch rather than the middle of it: close to
        // the trunk every branch is in the same place, and five signs landed
        // on top of each other. Out at the tips they have spread apart.
        const along = toMetres(ranked[Math.floor(ranked.length * 0.12)].point);

        // Pushed clear of the leaves, and every other one lifted, so two
        // branches that happen to end up side by side still read separately.
        const outward = new THREE.Vector3(along.x, 0, along.z).normalize();
        const sign = along
          .addScaledVector(outward, 0.7)
          .setY(along.y + 0.7 + (index % 2) * 0.85);

        return {
          branch,
          points: points.map(inWorld),
          sign: inWorld(sign),
        };
      }),
    [branches],
  );

  /**
   * Walk up and press E to browse the whole thing as a list.
   *
   * Pointing at a fruit works on a desktop, but a phone has no pointer and the
   * fruit at the top of a fourteen-metre tree are a long way from the ground.
   * This gives every device a way in, and registers the trunk as solid at the
   * same time — nobody walks through a tree.
   *
   * There is no `onEngage` here on purpose: the panel watches the interaction
   * state directly, so being engaged *is* the panel being open. Routing it
   * through `setOverlay` instead would have the overlay's own
   * `resetInteractions` slam it shut the instant it opened.
   */
  useInteractable({
    ref: group,
    id: "skillTree",
    label: "Skill Tree",
    verb: "Browse",
    radius: metres(7),
  });

  useFrame(({ clock }) => {
    uniforms.current.uTime.value = clock.elapsedTime;
  });

  return (
    <group ref={group} position={TREE_STATION.position}>
      {/* The model, in its own units, planted by its trunk rather than by the
          centre of its lopsided bounding box. */}
      <primitive
        object={tree}
        scale={metres(TREE_FIT)}
        position={[
          metres(-TREE_MODEL.trunk.x * TREE_FIT),
          metres(-TREE_MODEL.ground * TREE_FIT),
          metres(-TREE_MODEL.trunk.z * TREE_FIT),
        ]}
      />

      {/* Leaves moving in the wind, heard rather than seen. Up in the canopy,
          so it fades in as you walk under it. */}
      <group position={[0, metres(TREE_HEIGHT * 0.6), 0]}>
        <AmbientLoop
          url="/audio/leaves.mp3"
          refDistance={RUSTLE_RANGE}
          gain={1.4}
        />
      </group>

      {/* The blossom is the one part that stays in metres, because nothing in
          it is text and the arithmetic reads better that way. */}
      <group scale={metres(1)}>
        <FallingLeaves spread={TREE_MODEL.canopyRadius * TREE_FIT * 0.85} />
      </group>

      {/* What the whole thing is. Billboarded, so it reads from anywhere on
          the deck, and lit from within rather than relying on the scene's
          lamps — the canopy above it is in deep shade. */}
      <Billboard position={[0, metres(TREE_HEIGHT + 5.2), 0]}>
        <Text
          fontSize={metres(1.9)}
          anchorX="center"
          anchorY="middle"
          outlineWidth={metres(0.03)}
          outlineColor="#06111b"
          renderOrder={999}
        >
          SKILL TREE
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

        <Text
          position={[0, metres(-1.5), 0]}
          fontSize={metres(0.5)}
          anchorX="center"
          anchorY="middle"
          renderOrder={999}
        >
          walk up and press E, or point at a fruit
          <meshStandardMaterial
            color="#9fb6c9"
            emissive="#38bdf8"
            emissiveIntensity={0.9}
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
            transparent
          />
        </Text>
      </Billboard>

      {crops.map(({ branch, points, sign }) => (
        <group key={branch.id}>
          {points.length > 0 && (
            <SkillFruit
              branch={branch}
              points={points}
              radius={FRUIT_RADIUS}
              // The tree group stands on the grass, so ground is zero in its
              // own space — fruit falls to the foot of the trunk, not to the
              // world origin.
              groundY={DECK.surfaceY - TREE_STATION.position[1]}
            />
          )}

          {/* The stems, so the fruit hangs rather than floats. */}
          {points.map((point, index) => (
            <mesh
              key={index}
              position={[point.x, point.y + metres(STEM) / 2, point.z]}
            >
              <cylinderGeometry
                args={[metres(0.012), metres(0.012), metres(STEM), 5]}
              />
              <meshStandardMaterial color="#5b4330" roughness={0.9} />
            </mesh>
          ))}

          {/* The branch's name, pinned to the branch and turned to face you. */}
          <Billboard position={[sign.x, sign.y, sign.z]}>
            <HoloText size={0.78} color={branch.colour} onTop>
              {branch.label}
            </HoloText>
          </Billboard>
        </group>
      ))}
    </group>
  );
};

export default SkillTree;
