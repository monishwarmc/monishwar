"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useSettings } from "../settings/settings";
import { RING_RADIUS, SCALE } from "@/app/constants/world.constants";

/** The grass disc's usable radius, matching the controller's edge clamp. */
const FIELD_RADIUS = 1.6;
/** Clear ground around the fountain so blades do not grow through the basin. */
const FOUNTAIN_CLEAR = 0.09;

/**
 * A deterministic generator, at module scope so the field is identical between
 * reloads and the closure does not reassign anything the component owns.
 */
const makeRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

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

/**
 * Wind-blown grass, drawn as one instanced draw call.
 *
 * The sway happens entirely in the vertex shader: a per-instance phase plus a
 * travelling wave over the field, scaled by the height of the vertex so the
 * root stays put and only the tip moves. Doing it on the GPU is what makes
 * several thousand blades free — animating instance matrices on the CPU would
 * mean re-uploading the whole buffer every frame.
 */
const GrassField = () => {
  const { quality, grassDensity } = useSettings();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const uniforms = useRef({ uTime: { value: 0 } });

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

      // Injected rather than hard-coded so the bend always matches the mesh.
      const bladeHeight = BLADE_HEIGHT.toFixed(6);

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uTime;
           varying float vHeight;`,
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
           vHeight = bend;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           varying float vHeight;`,
        )
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           // Darker at the root, sun-caught at the tip.
           gl_FragColor.rgb *= mix(0.6, 1.15, vHeight);`,
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

      // Wear a path down the walkways out to each station.
      const toRing = Math.abs(radius - RING_RADIUS);
      if (toRing < 0.05 && random() < 0.65) continue;

      for (let b = 0; b < BLADES_PER_TUFT; b++) {
        const spread = Math.sqrt(random()) * TUFT_SPREAD;
        const around = random() * Math.PI * 2;

        dummy.position.set(
          cx + Math.sin(around) * spread,
          0.0295,
          cz + Math.cos(around) * spread,
        );
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

  useFrame(({ clock }) => {
    uniforms.current.uTime.value = clock.elapsedTime;
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
