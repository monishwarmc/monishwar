"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { MOVEMENT } from "@/app/constants/controls.constants";
import { useMonishwar } from "../contexts/MonishwarContext";
import { isPaved } from "@/app/constants/world.constants";
import { makeRandom } from "./random";
import { useSettings } from "../settings/settings";
import { RING_RADIUS, SCALE } from "@/app/constants/world.constants";

/** The grass disc's usable radius, matching the controller's edge clamp. */
const FIELD_RADIUS = 1.6;
/** Clear ground around the fountain so blades do not grow through the basin. */
const FOUNTAIN_CLEAR = 0.09;

/** Tufts, not blades — each one plants BLADES_PER_TUFT of them. */
const BASE_TUFTS: Record<string, number> = {
  low: 2000,
  balanced: 5200,
  high: 10000,
};

const BLADES_PER_TUFT = 9;
/** How far blades in a tuft spread from its centre. */
const TUFT_SPREAD = 0.009 * SCALE;

/**
 * Blade dimensions, in world units, scaled with the avatar.
 *
 * These must track SCALE. When they did not, growing the avatar left the
 * blades looking like stubble and the ground texture — which is mostly soil
 * with grass in it — showed through as brown mud.
 */
const BLADE_WIDTH = 0.0022 * SCALE;
const BLADE_HEIGHT = 0.0082 * SCALE;
/** Width left at the tip, as a fraction of the base. */
const BLADE_TAPER = 0.12;

/* ------------------------------------------------- being walked through */

/**
 * How far from the feet the grass gives way, in world units.
 *
 * About 0.5m, so the avatar leaves a path a metre wide. Wider than that and
 * it stops looking like grass being walked through and starts looking like a
 * crop circle following the avatar around.
 */
const PRESS_RADIUS = 0.02 * SCALE;
/** The wake is wider and softer than the feet that made it. */
const TRAIL_RADIUS = PRESS_RADIUS * 1.3;
/** How far a flattened blade leans away from the avatar. */
const PRESS_PUSH = BLADE_HEIGHT * 0.85;
/** How short a fully flattened blade gets, as a fraction of its height. */
const PRESS_SQUASH = 0.32;
/** Feet this far above the blades stop touching them — i.e. mid-jump. */
const PRESS_LIFT = BLADE_HEIGHT * 2.5;
/** How quickly the wake catches up with the avatar, per second. */
const TRAIL_RATE = 2.2;
/** Somewhere off the disc, so nothing is flattened before the avatar exists. */
const OFF_FIELD = 1e4;

const scratch = {
  feet: new THREE.Vector3(),
};

/**
 * Wind-blown grass, drawn as one instanced draw call.
 *
 * The sway happens entirely in the vertex shader: a per-instance phase plus a
 * travelling wave over the field, scaled by the height of the vertex so the
 * root stays put and only the tip moves. Doing it on the GPU is what makes
 * several thousand blades free — animating instance matrices on the CPU would
 * mean re-uploading the whole buffer every frame.
 *
 * The avatar parts it as it walks for the same reason and in the same place:
 * two uniforms — where the feet are, and where they were a moment ago — are
 * all the shader needs to push blades aside and let them spring back up
 * behind. Doing that per blade on the CPU would mean touching every matrix in
 * the buffer on every frame, which is precisely what this design avoids.
 */
const GrassField = () => {
  const { quality, grassDensity } = useSettings();
  const { ref: character } = useMonishwar();
  const mesh = useRef<THREE.InstancedMesh>(null);

  const uniforms = useRef({
    uTime: { value: 0 },
    /** The avatar's feet, in the field's own space. */
    uFeet: { value: new THREE.Vector3(OFF_FIELD, 0, OFF_FIELD) },
    /** The same point, lagging behind — the wake it leaves. */
    uWake: { value: new THREE.Vector3(OFF_FIELD, 0, OFF_FIELD) },
  });

  const tufts = Math.max(
    0,
    Math.round((BASE_TUFTS[quality] ?? BASE_TUFTS.balanced) * grassDensity),
  );

  const geometry = useMemo(() => {
    // Four segments is enough to bend convincingly at this scale.
    const blade = new THREE.PlaneGeometry(BLADE_WIDTH, BLADE_HEIGHT, 1, 4);
    blade.translate(0, BLADE_HEIGHT / 2, 0);

    // Taper to a point. A plain rectangle at a width grass can actually be
    // seen at reads as a leaf, not a blade — narrowing towards the tip is
    // what gives the field its texture.
    const position = blade.attributes.position;

    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      const t = THREE.MathUtils.clamp(y / BLADE_HEIGHT, 0, 1);
      position.setX(i, position.getX(i) * (1 - (1 - BLADE_TAPER) * t));
    }

    position.needsUpdate = true;
    blade.computeVertexNormals();

    return blade;
  }, []);

  const material = useMemo(() => {
    const mat = new THREE.MeshLambertMaterial({
      color: "#4f9440",
      side: THREE.DoubleSide,
      transparent: false,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.current.uTime;
      shader.uniforms.uFeet = uniforms.current.uFeet;
      shader.uniforms.uWake = uniforms.current.uWake;

      // Injected rather than hard-coded so the bend always matches the mesh.
      const bladeHeight = BLADE_HEIGHT.toFixed(6);

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uTime;
           uniform vec3 uFeet;
           uniform vec3 uWake;
           varying float vHeight;
           varying float vPressed;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           // instanceMatrix column 3 is the blade's world position; use it to
           // offset the wave so the field ripples instead of sweeping as one.
           vec3 root = vec3(instanceMatrix[3].x, instanceMatrix[3].y, instanceMatrix[3].z);
           float phase = root.x * 7.0 + root.z * 5.3;
           float gust = sin(uTime * 1.1 + phase) * 0.5 + sin(uTime * 2.3 + phase * 1.7) * 0.5;
           // position.y is the height up the blade, so the root does not slide.
           float bend = pow(max(transformed.y, 0.0) / ${bladeHeight}, 1.6);
           transformed.x += gust * bend * ${(0.0028 * SCALE).toFixed(6)};
           transformed.z += gust * bend * ${(0.0013 * SCALE).toFixed(6)};
           vHeight = bend;

           // --- the avatar walking through ---
           vec2 fromFeet = root.xz - uFeet.xz;
           float feetDistance = length(fromFeet);

           // Hard under the feet, easing off to nothing at the edge of the
           // step. Reversed smoothstep bounds because the press is strongest
           // at distance zero.
           float press = smoothstep(${PRESS_RADIUS.toFixed(6)}, 0.0, feetDistance);
           // Lift the feet clear — a jump should not mow the lawn.
           press *= 1.0 - smoothstep(0.0, ${PRESS_LIFT.toFixed(6)}, abs(uFeet.y - root.y));

           // The wake trails behind, so blades stand back up over a moment
           // rather than the instant the avatar's circle has passed them.
           float wake = smoothstep(${TRAIL_RADIUS.toFixed(6)}, 0.0, length(root.xz - uWake.xz)) * 0.55;
           float flattened = clamp(max(press, wake), 0.0, 1.0);

           // Lean away from whatever stood on it. The blade is rotated by its
           // own instance matrix, so the push has to be expressed in the
           // blade's axes or every blade would lean the same way.
           vec3 away = vec3(fromFeet.x, 0.0, fromFeet.y) / max(feetDistance, 1e-5);
           vec3 bladeX = normalize(vec3(instanceMatrix[0].xyz));
           vec3 bladeZ = normalize(vec3(instanceMatrix[2].xyz));

           transformed.x += dot(away, bladeX) * flattened * bend * ${PRESS_PUSH.toFixed(6)};
           transformed.z += dot(away, bladeZ) * flattened * bend * ${PRESS_PUSH.toFixed(6)};
           transformed.y *= mix(1.0, ${PRESS_SQUASH.toFixed(3)}, flattened);

           vPressed = flattened;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           varying float vHeight;
           varying float vPressed;`,
        )
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           // Darker at the root, sun-caught at the tip.
           gl_FragColor.rgb *= mix(0.6, 1.15, vHeight);
           // Crushed grass loses its sheen, which is what makes the trail
           // readable from above rather than only in silhouette.
           gl_FragColor.rgb *= mix(1.0, 0.82, vPressed);`,
        );
    };

    return mat;
  }, []);

  // Scatter once; the wind is all shader-side after this.
  const matrices = useMemo(() => {
    const list: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    const random = makeRandom(1337);

    // Grass grows in clumps. Scattering blades evenly made each one read as a
    // lone reed; tufting them puts enough blades close together to register as
    // a patch of lawn at the same total blade count.
    for (let i = 0; i < tufts; i++) {
      // sqrt keeps the scatter even rather than crowding the middle.
      const radius = Math.sqrt(random()) * FIELD_RADIUS;
      const angle = random() * Math.PI * 2;
      const cx = Math.sin(angle) * radius;
      const cz = Math.cos(angle) * radius;

      if (Math.hypot(cx, cz) < FOUNTAIN_CLEAR) continue;

      // Nothing grows through a floor. See `isPaved` in world.constants.
      //
      // The tuft centre is checked here and each blade again below, because a
      // tuft spreads about a quarter of a metre: skipping on the centre alone
      // left a fringe of blades standing on the edge of the stage, which is
      // the one place anybody would be looking at the boards closely.
      if (isPaved(cx, cz)) continue;

      // Wear a path down the walkways out to each station.
      const toRing = Math.abs(radius - RING_RADIUS);
      if (toRing < 0.05 && random() < 0.65) continue;

      for (let b = 0; b < BLADES_PER_TUFT; b++) {
        const spread = Math.sqrt(random()) * TUFT_SPREAD;
        const around = random() * Math.PI * 2;

        const bx = cx + Math.sin(around) * spread;
        const bz = cz + Math.cos(around) * spread;

        if (isPaved(bx, bz)) continue;

        dummy.position.set(bx, 0.0295, bz);
        // Lean outwards from the centre of the tuft, like a real clump.
        dummy.rotation.set(
          (random() - 0.5) * 0.35,
          random() * Math.PI,
          (random() - 0.5) * 0.35,
        );
        dummy.scale.set(0.8 + random() * 0.4, 0.6 + random() * 0.9, 1);
        dummy.updateMatrix();
        list.push(dummy.matrix.clone());
      }
    }

    return list;
  }, [tufts]);

  useFrame(({ clock }, rawDelta) => {
    uniforms.current.uTime.value = clock.elapsedTime;

    const body = character.current;
    const field = mesh.current;
    if (!body || !field) return;

    // The avatar's root sits a little under the grass (see MOVEMENT.feetOffset)
    // so the soles are what gets compared against the blades, not the ankles.
    body.getWorldPosition(scratch.feet);
    scratch.feet.y += MOVEMENT.feetOffset;
    field.worldToLocal(scratch.feet);

    uniforms.current.uFeet.value.copy(scratch.feet);
    uniforms.current.uWake.value.lerp(
      scratch.feet,
      1 - Math.exp(-TRAIL_RATE * Math.min(rawDelta, 0.1)),
    );
  });

  if (!matrices.length) return null;

  return (
    <instancedMesh
      ref={(node) => {
        mesh.current = node;
        if (!node) return;

        matrices.forEach((matrix, index) => node.setMatrixAt(index, matrix));
        node.instanceMatrix.needsUpdate = true;
        node.frustumCulled = false;
      }}
      args={[geometry, material, matrices.length]}
      castShadow={false}
      receiveShadow={false}
    />
  );
};

export default GrassField;
